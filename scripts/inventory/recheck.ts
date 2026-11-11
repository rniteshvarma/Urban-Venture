/**
 * Re-reads each researched listing's source page and records whether it is
 * still there (and, for 1acre land, its current asking price).
 *
 *   npx tsx --env-file=.env.local scripts/inventory/recheck.ts [--budget-minutes 50] [--limit N] [--host 1acre.in] [--dry]
 *
 * Oldest-checked first, so repeated runs with a time budget sweep the whole
 * inventory. Hosts run in parallel; each host is fetched one page at a time
 * with its own delay (1acre's robots.txt asks for 10 s). A page that fails to
 * load (5xx, timeout, block) is skipped, never marked gone.
 *
 * Runs weekly from .github/workflows/recheck-listings.yml (needs the
 * DATABASE_URL repository secret). Too slow for a Vercel function.
 */
import prisma from "../../src/lib/prisma";
import { CRAWL_DELAY_MS, hostOf, isPriceMove, readSourcePage } from "../../src/lib/inventory/recheck";

const arg = (k: string) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > -1 ? process.argv[i + 1] : undefined;
};
const DRY = process.argv.includes("--dry");
const BUDGET_MS = Number(arg("budget-minutes") ?? 50) * 60_000;
const LIMIT = arg("limit") ? Number(arg("limit")) : undefined;
const ONLY_HOST = arg("host");
const UA = "Mozilla/5.0 (compatible; PropertyTigerBot/1.0; listing re-check)";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Row = {
  id: string;
  name: string;
  minBudgetLakhs: number;
  maxBudgetLakhs: number;
  sourceGoneSince: Date | null;
  specifications: unknown;
  url: string;
};

async function main() {
  const started = new Date();
  const deadline = started.getTime() + BUDGET_MS;
  const projects = await prisma.project.findMany({
    where: { sourceType: "CSV_IMPORT", listingSource: "ADMIN", status: "ACTIVE" },
    select: { id: true, name: true, minBudgetLakhs: true, maxBudgetLakhs: true, sourceGoneSince: true, specifications: true },
    orderBy: [{ sourceCheckedAt: { sort: "asc", nulls: "first" } }],
  });

  const queues = new Map<string, Row[]>();
  for (const p of projects) {
    const sources = ((p.specifications as { sources?: { url?: string }[] } | null)?.sources ?? []).filter((s) => s.url && !/rerait\.telangana/.test(s.url));
    const url = sources[0]?.url;
    if (!url) continue;
    const host = hostOf(url);
    if (!CRAWL_DELAY_MS[host] || (ONLY_HOST && host !== ONLY_HOST)) continue;
    if (!queues.has(host)) queues.set(host, []);
    queues.get(host)!.push({ ...p, url });
  }
  if (LIMIT) for (const [h, q] of queues) queues.set(h, q.slice(0, LIMIT));

  const tally = { live: 0, gone: 0, unknown: 0, priceMoves: 0 };
  const goneNow: string[] = [];
  const unknownReasons: Record<string, number> = {};

  async function check(p: Row) {
    let status = 0, html = "";
    try {
      const res = await fetch(p.url, { headers: { "user-agent": UA, accept: "text/html" }, redirect: "follow", signal: AbortSignal.timeout(30_000) });
      status = res.status;
      html = status === 200 ? await res.text() : "";
    } catch (e) {
      tally.unknown++;
      const r = (e as Error).name === "TimeoutError" ? "timeout" : "network error";
      unknownReasons[r] = (unknownReasons[r] ?? 0) + 1;
      return;
    }
    const v = readSourcePage(p.url, status, html);
    const now = new Date();
    if (v.state === "UNKNOWN") {
      tally.unknown++;
      unknownReasons[v.reason] = (unknownReasons[v.reason] ?? 0) + 1;
      return;
    }
    if (v.state === "GONE") {
      tally.gone++;
      if (!p.sourceGoneSince) goneNow.push(`${p.name} (${v.reason})`);
      if (!DRY) await prisma.project.update({ where: { id: p.id }, data: { sourceCheckedAt: now, sourceState: "GONE", sourceGoneSince: p.sourceGoneSince ?? now } });
      return;
    }
    tally.live++;
    const next = v.priceLakh;
    const moved = next && isPriceMove({ min: p.minBudgetLakhs, max: p.maxBudgetLakhs }, next);
    if (moved) tally.priceMoves++;
    if (DRY) return;
    await prisma.$transaction(async (tx) => {
      await tx.project.update({
        where: { id: p.id },
        data: { sourceCheckedAt: now, sourceState: "LIVE", sourceGoneSince: null, ...(moved ? { minBudgetLakhs: next.min, maxBudgetLakhs: next.max } : {}) },
      });
      if (!moved) return;
      await tx.projectPriceChange.create({
        data: { projectId: p.id, fromMinLakh: p.minBudgetLakhs, toMinLakh: next.min, fromMaxLakh: p.maxBudgetLakhs, toMaxLakh: next.max, source: "recheck" },
      });
      // A land listing is one parcel: its single unit carries the asking price.
      const units = await tx.projectUnitType.findMany({ where: { projectId: p.id }, select: { id: true, areaSqYd: true } });
      if (units.length === 1) {
        const u = units[0];
        await tx.projectUnitType.update({
          where: { id: u.id },
          data: { priceLakh: next.min, priceValue: Math.round(next.min * 1e5), ...(u.areaSqYd ? { ratePerSqYd: Math.round((next.min * 1e5) / u.areaSqYd) } : {}) },
        });
      }
    });
  }

  await Promise.all(
    [...queues].map(async ([host, queue]) => {
      const delay = CRAWL_DELAY_MS[host];
      for (const p of queue) {
        if (Date.now() + delay > deadline) break;
        await check(p);
        await sleep(delay);
      }
    }),
  );

  const summary = {
    checked: tally.live + tally.gone,
    ...tally,
    unknownReasons,
    newlyGone: goneNow.length,
    queued: Object.fromEntries([...queues].map(([h, q]) => [h, q.length])),
    dry: DRY,
  };
  console.log(JSON.stringify(summary, null, 2));
  for (const g of goneNow.slice(0, 40)) console.log("  gone:", g);

  // Shown on /admin/system next to the Vercel crons.
  if (!DRY && !LIMIT && !ONLY_HOST) {
    const ok = summary.checked > 0 || tally.unknown === 0;
    await prisma.jobRun.create({ data: { job: "listing-recheck", startedAt: started, finishedAt: new Date(), ok, status: ok ? 200 : 500, summary, error: ok ? null : "every page failed to load" } });
  }
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
