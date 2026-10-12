/**
 * Developer track-record jobs.
 *
 *   syncCertificates   read the public TG-RERA certificate of every project
 *                      whose certificate link we have (quarterly, polite)
 *   syncOrders         read TG-RERA's order lists; for orders whose list row
 *                      doesn't name the respondent, read it from the order PDF
 *   rebuildDevelopers  group our listings into developers, match orders to
 *                      them by EXACT normalised name, compute track records
 *
 * Government sites time out from abroad — the cron runs in bom1. The first
 * backfill (≈1,400 order PDFs) is done locally and shipped as
 * prisma/data/rera-records.json (see scripts/developers/).
 */
import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import prisma from "../prisma";
import { govGet, needsGovTls } from "../http/gov-tls";
import { legalForm, normaliseOrgName, slugify } from "./names";
import { htmlToCells, isOrganisation, organisationIn, parseCertificate, parseOrderList, respondentFromOrderText, respondentFromTitle, respondentKey, type OrderKind } from "./rera";
import { developerStats, projectRecord, type ProjectInput, type ProjectRecord } from "./track-record";

type Log = (line: string) => void;
const DAY = 86_400_000;
const UA = "Mozilla/5.0 (compatible; PropertyTigerResearch/1.0; developer track records)";
export const CERT_DUE_DAYS = 85;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const ORDER_LISTS: { kind: OrderKind; url: string }[] = [
  { kind: "COMPLAINT", url: "https://rera.telangana.gov.in/586784u3y5dsgfg-TG-RERA-45678jklshihnfgsfdg" },
  { kind: "ADJUDICATION", url: "https://rera.telangana.gov.in/384798wfybwev9fya62435-TG-RERA-skfjdgky483yunskljghfdgjh" },
  { kind: "SUO_MOTU", url: "https://rera.telangana.gov.in/SUOMOTU-TG-RERA-15121976ORDERS" },
  { kind: "REVOCATION", url: "https://rera.telangana.gov.in/Home/Revoked" },
  { kind: "APPELLATE", url: "https://rera.telangana.gov.in/AnnualReports-TG-RERA-15121976REAT_Orders" },
];

/** GET text or bytes; certificate pages go through gov-tls (their host sends an incomplete chain). */
async function get(url: string, timeoutMs = 60_000): Promise<{ text: () => Promise<string>; arrayBuffer: () => Promise<ArrayBuffer> }> {
  if (needsGovTls(url)) {
    const { status, body } = await govGet(url, { headers: { "User-Agent": UA }, timeoutMs });
    if (status < 200 || status >= 300) throw new Error(`HTTP ${status} for ${new URL(url).pathname}`);
    return { text: async () => body.toString("utf8"), arrayBuffer: async () => body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength) as ArrayBuffer };
  }
  const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${new URL(url).pathname}`);
  return res;
}
const dateOrNull = (iso: string | null) => (iso ? new Date(`${iso}T00:00:00Z`) : null);

// ── Certificates ────────────────────────────────────────────────────────────

/**
 * TG-RERA starts answering "Unauthorized Access" after roughly a hundred
 * certificate views in a short spell. We stop at the first such answer and
 * read at most `max` per run, spaced out, so the rest arrive over the next
 * days — no retries, no workarounds.
 */
export const CERTS_PER_RUN = 15;
const CERT_GAP_MS = 6000;

export async function syncCertificates(opts: { budgetMs?: number; force?: boolean; max?: number; log?: Log } = {}) {
  const log = opts.log ?? (() => {});
  const started = Date.now();
  const projects = await prisma.project.findMany({
    where: { status: "ACTIVE", reraUrl: { contains: "rerait.telangana.gov.in" } },
    select: { id: true, name: true, reraNumber: true, reraUrl: true },
  });
  const existing = new Map((await prisma.reraCertificate.findMany({ select: { reraNumber: true, fetchedAt: true } })).map((c) => [c.reraNumber, c.fetchedAt]));
  const result = { done: 0, failed: 0, deferred: 0, throttled: false, errors: [] as string[] };
  const max = opts.max ?? CERTS_PER_RUN;
  for (const p of projects) {
    const rera = (p.reraNumber ?? "").split(",")[0].trim();
    if (!rera) continue;
    const seen = existing.get(rera);
    if (!opts.force && seen && Date.now() - seen.getTime() < CERT_DUE_DAYS * DAY) continue;
    if (result.throttled || result.done + result.failed >= max || (opts.budgetMs != null && Date.now() - started > opts.budgetMs)) { result.deferred++; continue; }
    try {
      const html = await (await get(p.reraUrl!)).text();
      if (/unauthori[sz]ed access/i.test(html)) {
        result.throttled = true;
        result.deferred++;
        log("[developers] TG-RERA answered 'Unauthorized' — stopping certificate reads for this run");
        continue;
      }
      const c = parseCertificate(htmlToCells(html));
      if (!c.proposedCompletion && !c.projectStatus) throw new Error("no certificate data on the page");
      const data = {
        projectId: p.id, url: p.reraUrl!, projectStatus: c.projectStatus,
        approvedDate: dateOrNull(c.approvedDate), proposedCompletion: dateOrNull(c.proposedCompletion), revisedCompletion: dateOrNull(c.revisedCompletion),
        litigation: c.litigation, criminalCase: c.criminalCase, promoterName: c.promoterName,
        buildings: c.buildings as unknown as Prisma.InputJsonValue, fetchedAt: new Date(),
      };
      await prisma.reraCertificate.upsert({ where: { reraNumber: rera }, create: { reraNumber: rera, ...data }, update: data });
      result.done++;
      log(`[developers] certificate ${rera} ${p.name}: ${c.projectStatus ?? "?"}, completion ${c.revisedCompletion ?? c.proposedCompletion ?? "?"}`);
    } catch (e) {
      result.failed++;
      result.errors.push(`certificate ${rera}: ${e instanceof Error ? e.message : String(e)}`);
    }
    await sleep(CERT_GAP_MS);
  }
  return result;
}

// ── Orders ──────────────────────────────────────────────────────────────────

async function pdfText(url: string): Promise<string> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const buf = new Uint8Array(await (await get(url, 90_000)).arrayBuffer());
  const pdf = await getDocumentProxy(buf, { verbosity: 0 });
  const { text } = await extractText(pdf, { mergePages: false });
  return (text as string[]).slice(0, 2).join("\n");
}

export async function syncOrders(opts: { budgetMs?: number; pdfLimit?: number; log?: Log } = {}) {
  const log = opts.log ?? (() => {});
  const started = Date.now();
  const result = { listed: 0, added: 0, fromPdf: 0, pdfFailed: 0, pdfDeferred: 0, errors: [] as string[] };

  for (const list of ORDER_LISTS) {
    try {
      const rows = parseOrderList(await (await get(list.url)).text(), list.kind);
      result.listed += rows.length;
      for (const r of rows) {
        const id = createHash("sha1").update(r.documentUrl).digest("hex");
        // A list cell can hold several parties ("Mr. A; M/s B Developers; …") — keep the organisation.
        const listed = r.respondent ? organisationIn(r.respondent.split(/;/).map((x) => x.trim()).filter(Boolean)) : null;
        const fromTitle = list.kind === "SUO_MOTU" ? respondentFromTitle(r.title) : null;
        const respondent = listed ?? (isOrganisation(fromTitle) ? fromTitle : null);
        const existing = await prisma.regulatoryOrder.findUnique({ where: { id }, select: { id: true, extractedFrom: true, respondent: true } });
        if (existing) {
          // Keep list-sourced rows in step with parser fixes; PDF-read rows are left alone.
          if (existing.extractedFrom === "LIST" && respondent && respondent !== existing.respondent) {
            await prisma.regulatoryOrder.update({ where: { id }, data: { respondent, respondentKey: respondentKey(respondent), projectName: r.projectName } });
          }
          continue;
        }
        await prisma.regulatoryOrder.create({
          data: {
            id, kind: r.kind, title: r.title, orderDate: dateOrNull(r.date), caseNumber: r.caseNumber,
            respondent, respondentKey: respondentKey(respondent), projectName: r.projectName, documentUrl: r.documentUrl,
            extractedFrom: respondent ? "LIST" : "PENDING",
          },
        });
        result.added++;
      }
      log(`[developers] ${list.kind}: ${rows.length} orders listed`);
    } catch (e) {
      result.errors.push(`${list.kind} list: ${e instanceof Error ? e.message : String(e)}`);
    }
    await sleep(1000);
  }

  // Read respondents from the order documents, newest first.
  const pending = await prisma.regulatoryOrder.findMany({ where: { extractedFrom: "PENDING" }, orderBy: { orderDate: "desc" }, take: opts.pdfLimit ?? 5000 });
  for (const o of pending) {
    if (opts.budgetMs != null && Date.now() - started > opts.budgetMs) { result.pdfDeferred++; continue; }
    try {
      const { respondent, projectName } = respondentFromOrderText(await pdfText(o.documentUrl), o.kind as OrderKind);
      await prisma.regulatoryOrder.update({
        where: { id: o.id },
        data: { respondent, respondentKey: respondentKey(respondent), projectName: o.projectName ?? projectName, extractedFrom: respondent ? "PDF" : "NONE", fetchedAt: new Date() },
      });
      if (respondent) result.fromPdf++;
    } catch (e) {
      result.pdfFailed++;
      result.errors.push(`order ${o.title}: ${e instanceof Error ? e.message : String(e)}`);
    }
    await sleep(1200);
  }
  if (result.fromPdf) log(`[developers] read ${result.fromPdf} respondents from order documents`);
  return result;
}

// ── Developers ──────────────────────────────────────────────────────────────

export interface DeveloperRecordJson {
  stats: ReturnType<typeof developerStats>;
  projects: ProjectRecord[];
  orders: { id: string; kind: string; title: string; date: string | null; caseNumber: string | null; projectName: string | null; url: string }[];
}

export async function rebuildDevelopers(opts: { log?: Log; today?: Date } = {}) {
  const log = opts.log ?? (() => {});
  const today = opts.today ?? new Date();
  const projects = await prisma.project.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, name: true, developer: true, reraNumber: true, specifications: true },
  });
  const certs = new Map((await prisma.reraCertificate.findMany()).map((c) => [c.projectId ?? c.reraNumber, c]));
  const orders = await prisma.regulatoryOrder.findMany({ where: { respondentKey: { not: null } } });

  // Group listings by normalised developer name.
  const groups = new Map<string, typeof projects>();
  for (const p of projects) {
    const key = normaliseOrgName(p.developer);
    if (!key) continue;
    groups.set(key, [...(groups.get(key) ?? []), p]);
  }

  // Each key → its group; legal names from certificates join their group's keys.
  const keyOwner = new Map<string, string>();
  const groupKeys = new Map<string, Set<string>>();
  for (const [key, ps] of groups) {
    const keys = new Set([key]);
    for (const p of ps) {
      const legal = certs.get(p.id)?.promoterName;
      if (legal) keys.add(normaliseOrgName(legal));
    }
    groupKeys.set(key, keys);
  }
  const ambiguous = new Set<string>();
  for (const [g, keys] of groupKeys) for (const k of keys) {
    if (keyOwner.has(k) && keyOwner.get(k) !== g) ambiguous.add(k);
    else keyOwner.set(k, g);
  }
  for (const k of ambiguous) keyOwner.delete(k); // never guess between two developers

  // Legal forms each group's names state (listings + certificate promoter names).
  const groupForms = new Map<string, Set<string>>();
  for (const [g, ps] of groups) {
    const forms = new Set<string>();
    for (const p of ps) {
      for (const n of [p.developer, certs.get(p.id)?.promoterName ?? ""]) {
        const f = legalForm(n);
        if (f) forms.add(f);
      }
    }
    groupForms.set(g, forms);
  }
  const ordersByGroup = new Map<string, typeof orders>();
  for (const o of orders) {
    const g = keyOwner.get(o.respondentKey!);
    if (!g) continue;
    // "X LLP" vs "X Pvt Ltd": same words, possibly a different entity — not a match.
    const f = o.respondent ? legalForm(o.respondent) : null;
    const forms = groupForms.get(g)!;
    if (f && forms.size && !forms.has(f)) continue;
    ordersByGroup.set(g, [...(ordersByGroup.get(g) ?? []), o]);
  }

  const usedSlugs = new Set<string>();
  const rows: { slug: string; group: string; ps: typeof projects; record: DeveloperRecordJson; name: string; aliases: string[]; legalNames: string[]; matchKeys: string[]; established: number | null }[] = [];
  for (const [g, ps] of groups) {
    const spellings = new Map<string, number>();
    for (const p of ps) spellings.set(p.developer.trim(), (spellings.get(p.developer.trim()) ?? 0) + 1);
    const name = [...spellings].sort((a, b) => b[1] - a[1] || a[0].length - b[0].length)[0][0];
    const baseSlug = slugify(name) || slugify(g) || "developer";
    let slug = baseSlug;
    for (let i = 2; usedSlugs.has(slug); i++) slug = `${baseSlug}-${i}`;
    usedSlugs.add(slug);

    const gOrders = ordersByGroup.get(g) ?? [];
    const revokedProjects = new Set(gOrders.filter((o) => o.kind === "REVOCATION" && o.projectName).map((o) => normaliseOrgName(o.projectName!)));
    const records = ps.map((p) => {
      const spec = (p.specifications ?? {}) as { constructionStatus?: string; possessionRera?: string | null; possessionTarget?: string | null; litigation?: string | null; developerEstablished?: number | null };
      const c = certs.get(p.id);
      const input: ProjectInput = {
        id: p.id,
        name: p.name,
        reraNumbers: (p.reraNumber ?? "").split(",").map((s) => s.trim()).filter(Boolean),
        status: spec.constructionStatus ?? "UNKNOWN",
        target: spec.possessionTarget ?? null,
        listedReraDate: spec.possessionRera ?? null,
        listedLitigation: spec.litigation === "Yes" ? "Yes" : spec.litigation === "No" ? "No" : null,
        certificate: c ? {
          url: c.url, projectStatus: c.projectStatus,
          proposedCompletion: c.proposedCompletion?.toISOString().slice(0, 10) ?? null,
          revisedCompletion: c.revisedCompletion?.toISOString().slice(0, 10) ?? null,
          litigation: c.litigation, criminalCase: c.criminalCase,
        } : null,
        revoked: revokedProjects.has(normaliseOrgName(p.name)),
      };
      return projectRecord(input, today);
    });
    const established = ps.map((p) => (p.specifications as { developerEstablished?: number | null } | null)?.developerEstablished).find((y): y is number => typeof y === "number") ?? null;
    rows.push({
      slug, group: g, ps, name, established,
      aliases: [...spellings.keys()].filter((s) => s !== name),
      legalNames: [...new Set(ps.map((p) => certs.get(p.id)?.promoterName).filter((n): n is string => !!n))],
      matchKeys: [...(groupKeys.get(g) ?? [])].filter((k) => !ambiguous.has(k)),
      record: {
        stats: developerStats(records, gOrders.length),
        projects: records.sort((a, b) => (b.flags.length - a.flags.length) || a.name.localeCompare(b.name)),
        orders: gOrders
          .sort((a, b) => (b.orderDate?.getTime() ?? 0) - (a.orderDate?.getTime() ?? 0))
          .map((o) => ({ id: o.id, kind: o.kind, title: o.title, date: o.orderDate?.toISOString().slice(0, 10) ?? null, caseNumber: o.caseNumber, projectName: o.projectName, url: o.documentUrl })),
      },
    });
  }

  await prisma.$transaction([
    prisma.developer.deleteMany({}),
    prisma.developer.createMany({
      data: rows.map((r) => ({ slug: r.slug, name: r.name, aliases: r.aliases, legalNames: r.legalNames, matchKeys: r.matchKeys, established: r.established, stats: r.record as unknown as Prisma.InputJsonValue, computedAt: new Date() })),
    }),
  ]);
  for (const r of rows) await prisma.project.updateMany({ where: { id: { in: r.ps.map((p) => p.id) } }, data: { developerSlug: r.slug } });
  for (const [g, list] of ordersByGroup) {
    const slug = rows.find((r) => r.group === g)?.slug;
    if (slug) await prisma.regulatoryOrder.updateMany({ where: { id: { in: list.map((o) => o.id) } }, data: { developerSlug: slug } });
  }
  log(`[developers] ${rows.length} developers, ${[...ordersByGroup.values()].reduce((n, l) => n + l.length, 0)} RERA orders matched (${ambiguous.size} ambiguous names skipped)`);
  return { developers: rows.length, matchedOrders: [...ordersByGroup.values()].reduce((n, l) => n + l.length, 0) };
}
