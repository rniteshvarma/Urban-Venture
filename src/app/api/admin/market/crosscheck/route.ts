/**
 * GET /api/admin/market/crosscheck — INTERNAL. Our measured corridor prices
 * next to MagicBricks locality averages and the official guidance values,
 * with the gap flagged. MagicBricks figures are for calibration only and are
 * never sent to a public API (owner's decision).
 */
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { MARKET_SOURCES } from "@/lib/market/feeds/run";
import type { CorridorMarketStats } from "@/lib/market/compute";

export const dynamic = "force-dynamic";

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length ? (s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2) : null;
};

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.res;
  const [corridors, portal] = await Promise.all([
    prisma.corridorProfile.findMany({ select: { slug: true, shortName: true, name: true, marketStats: true } }),
    prisma.marketObservation.findMany({ where: { source: "MAGICBRICKS" }, orderBy: { observedAt: "desc" } }),
  ]);
  // Newest observation per (locality, metric).
  const latest = new Map<string, (typeof portal)[number]>();
  for (const o of portal) if (!latest.has(`${o.scopeKey}|${o.metric}`)) latest.set(`${o.scopeKey}|${o.metric}`, o);

  const rows = corridors.map((c) => {
    const m = c.marketStats as unknown as CorridorMarketStats | null;
    const locs = MARKET_SOURCES[c.slug]?.magicbricksLocalities ?? [];
    const pick = (metric: string) =>
      locs.map((l) => latest.get(`${l}|${metric}`)).filter((o): o is NonNullable<typeof o> => !!o)
        .map((o) => ({ locality: o.scopeKey, value: o.value, period: o.period, yoyPct: (o.meta as { yoyPct?: number | null } | null)?.yoyPct ?? null, url: o.sourceUrl }));
    const side = (ours: number | null, theirs: ReturnType<typeof pick>) => {
      const portalMedian = median(theirs.map((t) => t.value));
      return { ours, portalMedian, gapPct: ours && portalMedian ? Math.round(((ours - portalMedian) / portalMedian) * 100) : null, localities: theirs };
    };
    return {
      slug: c.slug,
      name: c.shortName || c.name,
      plot: { ...side(m?.rates.plot?.median ?? null, pick("portal_plot_sqyd")), projects: m?.rates.plot?.projects ?? 0, guidance: m?.guidance?.land?.median ?? null },
      apartment: { ...side(m?.rates.apartment?.median ?? null, pick("portal_apartment_sqft")), projects: m?.rates.apartment?.projects ?? 0, guidance: m?.guidance?.apartment?.median ?? null },
    };
  });
  return NextResponse.json({ rows });
}
