// DB gather layer for the weekly report. Pulls everything the pure ladder
// (assemble.ts) needs, using only existing tables. Kept separate so the ladder
// stays pure and unit-testable.
//
// Two things worth knowing:
//  • Project.corridor is free-text (a name), while preferences store
//    CorridorProfile.slug — we build a name→slug map to join them.
//  • "Since last report" score/price baselines come from the user's PREVIOUS
//    WeeklyReport.content (the send ledger is the baseline), not a snapshot
//    table — there isn't one. First issue → no baseline, deltas are null.

import prisma from "@/lib/prisma";
import type {
  GatheredData, PrefSnapshot, PropertyCand, CorridorSnapshot, ApprovalCand,
  InfraCand, LegalCand, MarketPulseSnapshot, RecentItem, ReportContent, ReportItemType,
} from "./types";
import { parseAreas } from "../concierge/parse";

const DEDUP_WINDOW_DAYS = 28;
const SQYD_PER_ACRE = 4840;

function displayArea(sqYd: number | null): { value: number; unit: "acre" | "sqyd" } | null {
  if (!sqYd || sqYd <= 0) return null;
  return sqYd >= SQYD_PER_ACRE ? { value: Math.round((sqYd / SQYD_PER_ACRE) * 100) / 100, unit: "acre" } : { value: Math.round(sqYd), unit: "sqyd" };
}

export async function gatherReportData(userId: string, periodStart: Date, periodEnd: Date): Promise<GatheredData> {
  const pref = await prisma.reportPreference.findUnique({ where: { userId } });
  const snapshot: PrefSnapshot = {
    city: pref?.city ?? "Hyderabad",
    budgetMinLakh: pref?.budgetMinLakh ?? null,
    budgetMaxLakh: pref?.budgetMaxLakh ?? null,
    areaSlugs: pref?.areaSlugs ?? [],
    propertyTypes: (pref?.propertyTypes ?? []) as string[],
    horizonYears: pref?.horizonYears ?? null,
  };

  // Corridor reference: slug ⇄ name, mid price, score.
  const corridors = await prisma.corridorProfile.findMany({
    where: { isPublished: true },
    select: { slug: true, name: true, shortName: true, overallScore: true, plotPriceMidSqYd: true },
  });
  const byName = new Map<string, string>(); // lowercased name/shortName → slug
  const bySlug = new Map<string, (typeof corridors)[number]>();
  for (const c of corridors) {
    bySlug.set(c.slug, c);
    byName.set(c.name.toLowerCase(), c.slug);
    byName.set(c.shortName.toLowerCase(), c.slug);
    byName.set(c.slug.toLowerCase(), c.slug);
  }
  // Project.corridor is free-text ("Shadnagar Corridor", "Adibatla IT Corridor")
  // and rarely equals a CorridorProfile name exactly, so fall back to matching a
  // corridor whose shortName appears within the project's corridor string.
  const slugForCorridorName = (name: string | null): string | null => {
    if (!name) return null;
    const lc = name.toLowerCase();
    const exact = byName.get(lc);
    if (exact) return exact;
    for (const c of corridors) {
      if (lc.includes(c.shortName.toLowerCase())) return c.slug;
    }
    // Distinctive words of the corridor's name/slug ("Shamshabad / Aerospace SEZ", "Pharma City…").
    return parseAreas(name, corridors)?.slugs[0] ?? null;
  };

  // ── Approved properties in the user's city ──
  const projects = await prisma.project.findMany({
    where: { listingStatus: "APPROVED", city: snapshot.city },
    select: {
      id: true, name: true, corridor: true, propertyType: true, minBudgetLakhs: true, maxBudgetLakhs: true,
      totalAreaSqYd: true, listingScore: true, listingSource: true, approvalStatus: true, approvalVerified: true,
      imageUrls: true, createdAt: true, _count: { select: { media: true } },
    },
    take: 500,
  });

  const toCand = (p: (typeof projects)[number]): PropertyCand => {
    const slug = slugForCorridorName(p.corridor);
    const priceLakh = p.maxBudgetLakhs || p.minBudgetLakhs || 0;
    const area = displayArea(p.totalAreaSqYd);
    const rateValue = area && area.value > 0 && priceLakh > 0 ? Math.round((priceLakh * 100000) / area.value) : null;
    // fair value = the corridor's mid plot rate (only meaningful for plots/land)
    const fair = slug ? bySlug.get(slug)?.plotPriceMidSqYd ?? null : null;
    return {
      id: p.id, name: p.name, corridorSlug: slug, propertyType: p.propertyType, priceLakh,
      rateValue, rateUnit: area?.unit ?? null, areaValue: area?.value ?? null, areaUnit: area?.unit ?? null,
      listingScore: p.listingScore, listingSource: p.listingSource as "ADMIN" | "SELLER",
      approvalStatus: p.approvalStatus, approvalVerified: p.approvalVerified, mediaCount: p._count.media,
      thumb: p.imageUrls?.[0] ?? null, createdAt: p.createdAt,
      fairValueMidRate: area?.unit === "acre" ? null : fair, // only compare like-for-like (per sq.yd)
    };
  };

  const approvedProperties = projects.map(toCand);

  // ── Previous issue baselines (score/price per watched area) ──
  const prevReport = await prisma.weeklyReport.findFirst({
    where: { userId, status: { in: ["GENERATED", "QUEUED", "SENT"] } },
    orderBy: { issueNumber: "desc" },
    select: { content: true },
  });
  const prevAreas = new Map<string, { score: number | null; price: number | null }>();
  if (prevReport?.content) {
    const c = prevReport.content as unknown as ReportContent;
    for (const a of c.areas ?? []) prevAreas.set(a.slug, { score: a.score, price: a.priceMidSqYd });
  }

  // ── Watched areas ──
  const watchedAreas: CorridorSnapshot[] = [];
  for (const slug of snapshot.areaSlugs) {
    const cp = bySlug.get(slug);
    if (!cp) continue;
    const newListings = await prisma.project.count({
      where: { listingStatus: "APPROVED", corridor: cp.name, createdAt: { gte: periodStart, lte: periodEnd } },
    });
    const prev = prevAreas.get(slug);
    watchedAreas.push({
      slug, name: cp.shortName, overallScore: cp.overallScore, plotPriceMidSqYd: cp.plotPriceMidSqYd,
      newListings, prevScore: prev?.score ?? null, prevPriceMidSqYd: prev?.price ?? null,
    });
  }

  // ── New approvals in watched areas (this period) ──
  const approvalRows = snapshot.areaSlugs.length
    ? await prisma.approvalRecord.findMany({
        where: { corridorProfileSlug: { in: snapshot.areaSlugs }, createdAt: { gte: periodStart, lte: periodEnd } },
        select: { id: true, approvalNumber: true, approvalType: true, corridorProfileSlug: true, areaAcres: true, approvalDate: true },
        take: 10,
      })
    : [];
  const newApprovals: ApprovalCand[] = approvalRows.map((a) => ({
    id: a.id, approvalNumber: a.approvalNumber, approvalType: String(a.approvalType),
    corridorSlug: a.corridorProfileSlug, corridorName: a.corridorProfileSlug ? bySlug.get(a.corridorProfileSlug)?.shortName ?? null : null,
    areaAcres: a.areaAcres, approvalDate: a.approvalDate,
  }));

  // ── Infra milestones in watched areas (this period) ──
  const infraRows = snapshot.areaSlugs.length
    ? await prisma.infraMilestone.findMany({
        where: { OR: [{ date: { gte: periodStart, lte: periodEnd } }, { date: null }], project: { affectedCorridorSlugs: { hasSome: snapshot.areaSlugs } } },
        select: { id: true, title: true, date: true, description: true, project: { select: { shortName: true, category: true, affectedCorridorSlugs: true } } },
        orderBy: { date: "desc" },
        take: 6,
      })
    : [];
  const infraMilestones: InfraCand[] = infraRows.map((m) => {
    const hit = m.project.affectedCorridorSlugs.filter((s) => snapshot.areaSlugs.includes(s));
    return {
      id: m.id, projectShortName: m.project.shortName, category: String(m.project.category), title: m.title,
      date: m.date, description: m.description, affectedSlugs: hit,
      affectedNames: hit.map((s) => bySlug.get(s)?.shortName ?? s),
    };
  });

  // ── Legal flags affecting watched areas ──
  const legalRows = snapshot.areaSlugs.length
    ? await prisma.legalRisk.findMany({
        where: { affectedZones: { hasSome: snapshot.areaSlugs }, createdAt: { gte: periodStart, lte: periodEnd } },
        select: { id: true, title: true, severity: true, affectedZones: true },
        take: 5,
      })
    : [];
  const legalFlags: LegalCand[] = legalRows.map((l) => {
    const slug = l.affectedZones.find((z) => snapshot.areaSlugs.includes(z)) ?? null;
    return { id: l.id, title: l.title, severity: String(l.severity), corridorSlug: slug, corridorName: slug ? bySlug.get(slug)?.shortName ?? null : null };
  });

  // ── Market pulse (latest) ──
  const mp = await prisma.marketPulse.findFirst({ orderBy: { reportDate: "desc" } });
  const marketPulse: MarketPulseSnapshot | null = mp
    ? { period: mp.period, totalRegistrations: mp.totalRegistrations, yoyGrowthPct: mp.yoyGrowthPct, avgAskingPriceSqFt: mp.avgAskingPriceSqFt, source: mp.source }
    : null;

  // ── Top movers statewide (L4) — highest-scoring corridors ──
  const topMovers: CorridorSnapshot[] = corridors
    .filter((c) => c.overallScore != null)
    .sort((a, b) => (b.overallScore ?? 0) - (a.overallScore ?? 0))
    .slice(0, 3)
    .map((c) => ({ slug: c.slug, name: c.shortName, overallScore: c.overallScore, plotPriceMidSqYd: c.plotPriceMidSqYd, newListings: 0, prevScore: null, prevPriceMidSqYd: null }));

  // ── Recent ledger for dedup ──
  const recentRows = await prisma.reportItem.findMany({
    where: { userId, includedAt: { gte: new Date(Date.now() - DEDUP_WINDOW_DAYS * 86_400_000) } },
    select: { itemType: true, entityId: true, entityHash: true, includedAt: true },
  });
  const recentItems: RecentItem[] = recentRows.map((r) => ({ itemType: r.itemType as ReportItemType, entityId: r.entityId, entityHash: r.entityHash, includedAt: r.includedAt }));

  return {
    pref: snapshot, approvedProperties, watchedAreas,
    adjacency: {}, // no corridor-adjacency dataset yet → area-relaxed near-misses degrade to none
    adjacentProperties: [],
    newApprovals, infraMilestones, legalFlags, marketPulse, topMovers, recentItems,
  };
}
