/**
 * What Hyderabad buyers are looking at, from their own actions on Property
 * Tiger: enquiries, site-visit requests, saved homes, saved searches and
 * homes opened by signed-in buyers. Counted as distinct buyers (not clicks),
 * so one person can't inflate an area.
 *
 * Privacy: only aggregate counts are published, an area needs at least
 * MIN_PER_AREA distinct buyers to be listed, and nothing is shown until
 * MIN_TOTAL buyers have acted in the window.
 */
import prisma from "../prisma";

export const MIN_PER_AREA = 5;
export const MIN_TOTAL = 30;

export interface DemandEvent {
  /** phone (last 10 digits) or user id — whatever identifies the buyer */
  buyer: string;
  area: string | null;
  type: string | null;
  budgetLakh: number | null;
}

export interface Demand {
  enough: boolean;
  buyers: number;
  areas: { area: string; buyers: number; share: number }[];
  types: { type: string; buyers: number; share: number }[];
  budgets: { band: string; buyers: number; share: number }[];
}

const BANDS: [string, number, number][] = [
  ["Under ₹50 L", 0, 50], ["₹50 L – ₹1 Cr", 50, 100], ["₹1 Cr – ₹2 Cr", 100, 200], ["Above ₹2 Cr", 200, Infinity],
];

function shares<T extends string>(m: Map<T, Set<string>>, total: number, min: number) {
  return [...m.entries()]
    .map(([k, s]) => ({ k, buyers: s.size }))
    .filter((x) => x.buyers >= min)
    .sort((a, b) => b.buyers - a.buyers)
    .map((x) => ({ k: x.k, buyers: x.buyers, share: Math.round((x.buyers / total) * 100) }));
}

/** Pure: distinct buyers per area, property type and budget band. */
export function aggregateDemand(events: DemandEvent[], opts: { minPerArea?: number; minTotal?: number } = {}): Demand {
  const minPer = opts.minPerArea ?? MIN_PER_AREA;
  const minTotal = opts.minTotal ?? MIN_TOTAL;
  const all = new Set(events.map((e) => e.buyer));
  const byArea = new Map<string, Set<string>>();
  const byType = new Map<string, Set<string>>();
  const budget = new Map<string, number>();
  for (const e of events) {
    if (e.area) byArea.set(e.area, (byArea.get(e.area) ?? new Set()).add(e.buyer));
    if (e.type) byType.set(e.type, (byType.get(e.type) ?? new Set()).add(e.buyer));
    if (e.budgetLakh != null && e.budgetLakh > 0) budget.set(e.buyer, Math.max(budget.get(e.buyer) ?? 0, e.budgetLakh));
  }
  const byBand = new Map<string, Set<string>>();
  for (const [buyer, b] of budget) {
    const band = BANDS.find(([, lo, hi]) => b >= lo && b < hi)![0];
    byBand.set(band, (byBand.get(band) ?? new Set()).add(buyer));
  }
  const total = all.size;
  if (total < minTotal) return { enough: false, buyers: total, areas: [], types: [], budgets: [] };
  const budgetTotal = budget.size || 1;
  return {
    enough: true,
    buyers: total,
    areas: shares(byArea, total, minPer).map(({ k, ...r }) => ({ area: k, ...r })),
    types: shares(byType, total, minPer).map(({ k, ...r }) => ({ type: k, ...r })),
    budgets: BANDS.map(([band]) => ({ band, buyers: byBand.get(band)?.size ?? 0 }))
      .filter((b) => b.buyers >= minPer)
      .map((b) => ({ ...b, share: Math.round((b.buyers / budgetTotal) * 100) })),
  };
}

const key10 = (phone: string | null | undefined) => (phone ?? "").replace(/\D/g, "").slice(-10) || null;

/** Buyer actions in the last `days` days, aggregated. */
export async function buyerDemand(days = 90): Promise<Demand & { since: Date }> {
  const since = new Date(Date.now() - days * 86_400_000);
  const proj = { select: { corridor: true, propertyType: true } } as const;
  const [enquiries, visits, saved, views, searches] = await Promise.all([
    prisma.listingEnquiry.findMany({ where: { createdAt: { gte: since } }, select: { buyerPhone: true, buyerUserId: true, budgetLakh: true, project: proj } }),
    prisma.siteVisit.findMany({ where: { createdAt: { gte: since } }, select: { phone: true, userId: true, project: proj } }),
    prisma.savedProject.findMany({ where: { savedAt: { gte: since } }, select: { userId: true, project: proj } }),
    prisma.recentView.findMany({ where: { viewedAt: { gte: since } }, select: { userId: true, project: proj } }),
    prisma.savedSearch.findMany({ where: { createdAt: { gte: since } }, select: { userId: true, filters: true } }),
  ]);
  const events: DemandEvent[] = [];
  for (const e of enquiries) {
    const buyer = e.buyerUserId ?? key10(e.buyerPhone);
    if (buyer) events.push({ buyer, area: e.project?.corridor ?? null, type: e.project?.propertyType ?? null, budgetLakh: e.budgetLakh });
  }
  for (const v of visits) {
    const buyer = v.userId ?? key10(v.phone);
    if (buyer) events.push({ buyer, area: v.project?.corridor ?? null, type: v.project?.propertyType ?? null, budgetLakh: null });
  }
  for (const s of [...saved, ...views]) events.push({ buyer: s.userId, area: s.project?.corridor ?? null, type: s.project?.propertyType ?? null, budgetLakh: null });
  for (const s of searches) {
    const f = (s.filters ?? {}) as { corridor?: string; type?: string };
    events.push({ buyer: s.userId, area: f.corridor && f.corridor !== "ALL" ? f.corridor : null, type: f.type && f.type !== "ALL" ? f.type : null, budgetLakh: null });
  }
  return { since, ...aggregateDemand(events) };
}
