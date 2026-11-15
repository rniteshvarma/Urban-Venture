/**
 * Everything the redesigned homepage shows, read from the database in one go.
 * Every number on the page comes from here — nothing is typed into the page.
 */
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { projectWhere, type ProjectFilters } from "@/lib/projects/query";
import { recordOf } from "@/lib/developers/display";
import { gradeOf } from "@/lib/inventory/rating";
import { freshnessOf } from "@/lib/inventory/freshness";

export interface HomeCard {
  id: string;
  name: string;
  developer: string;
  locality: string;
  propertyType: string;
  listingKind: string;
  minLakh: number;
  maxLakh: number;
  image: string | null;
  rera: boolean;
  grade: string | null;
  score: number | null;
  /** Property Tiger Score, 0–10 (eight lenses); null when too little is known. */
  tiger: number | null;
  possession: string | null;
  configs: string | null;
  checked: string | null;
}

const CARD_SELECT = {
  id: true, name: true, developer: true, corridor: true, propertyType: true, minBudgetLakhs: true, maxBudgetLakhs: true,
  imageUrls: true, reraNumber: true, listingScore: true, tigerScore: true, sourceType: true, possessionText: true, specifications: true,
  sourceCheckedAt: true, sourceState: true, sourceGoneSince: true,
  unitTypes: { select: { label: true, unitCategory: true }, orderBy: { displayOrder: "asc" as const } },
} satisfies Prisma.ProjectSelect;

type Row = Prisma.ProjectGetPayload<{ select: typeof CARD_SELECT }>;

/** "2, 3 & 4 BHK" from the unit labels; plots and land get nothing (the price says it). */
function configsOf(units: Row["unitTypes"]): string | null {
  const bhk = [...new Set(units.map((u) => u.label.match(/(\d+(?:\.5)?)\s*BHK/i)?.[1]).filter(Boolean) as string[])].sort((a, b) => Number(a) - Number(b));
  if (!bhk.length) return null;
  return bhk.length === 1 ? `${bhk[0]} BHK` : `${bhk.slice(0, -1).join(", ")} & ${bhk.at(-1)} BHK`;
}

function toCard(r: Row, now: Date): HomeCard {
  const spec = (r.specifications ?? {}) as { locality?: string; listingKind?: string; sources?: { url?: string; accessed?: string }[] };
  const listingKind = spec.listingKind ?? "PROJECT";
  const isInventory = r.sourceType === "CSV_IMPORT" && r.listingScore != null;
  return {
    id: r.id,
    name: r.name,
    developer: r.developer,
    locality: spec.locality ?? r.corridor,
    propertyType: r.propertyType,
    listingKind,
    minLakh: r.minBudgetLakhs,
    maxLakh: r.maxBudgetLakhs,
    image: r.imageUrls[0] ?? null,
    rera: !!r.reraNumber,
    grade: isInventory ? gradeOf(r.listingScore!) : null,
    score: isInventory ? r.listingScore : null,
    tiger: r.tigerScore,
    possession: r.possessionText,
    configs: configsOf(r.unitTypes),
    checked: r.sourceType === "CSV_IMPORT" ? freshnessOf({ listingKind, sources: spec.sources, sourceCheckedAt: r.sourceCheckedAt, sourceState: r.sourceState, sourceGoneSince: r.sourceGoneSince }, now).label : null,
  };
}

const LAND: Prisma.ProjectWhereInput = { specifications: { path: ["listingKind"], equals: "LAND_LISTING" } };
const PROJECT: Prisma.ProjectWhereInput = { specifications: { path: ["listingKind"], equals: "PROJECT" } };
const status = (s: string): Prisma.ProjectWhereInput => ({ specifications: { path: ["constructionStatus"], equals: s } });
const and = (f: ProjectFilters, ...extra: Prisma.ProjectWhereInput[]): Prisma.ProjectWhereInput => ({ AND: [projectWhere(f), ...extra] });

/** Budget shortcuts: label, the /projects link, and how many listings it opens. */
const BUDGET_TILES: { label: string; sub: string; filters: ProjectFilters; href: string; extra?: Prisma.ProjectWhereInput }[] = [
  { label: "₹30 – 60 L", sub: "Flats", filters: { type: "Apartment", minBudget: 30, maxBudget: 60 }, href: "/projects?type=Apartment&budget=30-60L" },
  { label: "₹60 L – ₹1.2 Cr", sub: "Flats", filters: { type: "Apartment", minBudget: 60, maxBudget: 120 }, href: "/projects?type=Apartment&budget=60-120L" },
  { label: "Above ₹1.2 Cr", sub: "Flats & villas", filters: { minBudget: 120 }, href: "/projects?budget=%3E120L", extra: { propertyType: { in: ["Apartment", "Villa"] } } },
  { label: "Plots under ₹30 L", sub: "Open plots", filters: { type: "Plots", maxBudget: 30 }, href: "/projects?type=Plots&budget=%3C30L" },
  { label: "Plots ₹30 – 60 L", sub: "Open plots", filters: { type: "Plots", minBudget: 30, maxBudget: 60 }, href: "/projects?type=Plots&budget=30-60L" },
  { label: "Farm land", sub: "Near the RRR", filters: { type: "Land" }, href: "/projects?type=Land" },
];

const STAGE = ["COMPLETE", "PARTIALLY_COMPLETE", "UNDER_CONSTRUCTION", "APPROVED", "LAND_ACQUISITION", "ANNOUNCED", "DELAYED"];

export async function loadHome() {
  const now = new Date();
  const take = 10;
  const order: Prisma.ProjectOrderByWithRelationInput[] = [{ tigerScore: { sort: "desc", nulls: "last" } }, { listingScore: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }];
  const withImage: Prisma.ProjectWhereInput = { NOT: { imageUrls: { isEmpty: true } } };

  const [
    total, rera, land, plots, ready, underConstruction, scored,
    topRated, readyHomes, under1Cr, plotList, landList,
    budgetCounts, localityRows, corridors, infra, developers, news, infraTotal,
  ] = await Promise.all([
    prisma.project.count({ where: projectWhere({}) }),
    prisma.project.count({ where: and({}, PROJECT, { reraNumber: { not: null } }) }),
    prisma.project.count({ where: and({}, LAND) }),
    prisma.project.count({ where: and({ type: "Plots" }) }),
    prisma.project.count({ where: and({}, PROJECT, status("READY")) }),
    prisma.project.count({ where: and({}, PROJECT, status("UNDER_CONSTRUCTION")) }),
    prisma.project.count({ where: and({}, { tigerScore: { not: null } }) }),
    prisma.project.findMany({ where: and({}, PROJECT, withImage, { propertyType: { in: ["Apartment", "Villa"] } }), select: CARD_SELECT, orderBy: order, take }),
    prisma.project.findMany({ where: and({}, PROJECT, withImage, status("READY"), { propertyType: { in: ["Apartment", "Villa"] } }), select: CARD_SELECT, orderBy: order, take }),
    prisma.project.findMany({ where: and({ maxBudget: 100 }, PROJECT, withImage, { minBudgetLakhs: { lte: 100 }, propertyType: { in: ["Apartment", "Villa"] } }), select: CARD_SELECT, orderBy: order, take }),
    prisma.project.findMany({ where: and({ type: "Plots" }, PROJECT), select: CARD_SELECT, orderBy: order, take }),
    prisma.project.findMany({ where: and({ type: "Land" }, LAND), select: CARD_SELECT, orderBy: [{ tigerScore: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }], take }),
    Promise.all(BUDGET_TILES.map((b) => prisma.project.count({ where: and(b.filters, ...(b.extra ? [b.extra] : [])) }))),
    prisma.$queryRaw<{ locality: string; n: bigint }[]>`
      SELECT specifications->>'locality' AS locality, count(*) AS n FROM "Project"
      WHERE status = 'ACTIVE' AND "listingStatus" = 'APPROVED' AND "reviewState" = 'PUBLISHED'
        AND specifications->>'listingKind' = 'PROJECT' AND specifications->>'locality' IS NOT NULL
      GROUP BY 1 ORDER BY 2 DESC LIMIT 14`,
    prisma.corridorProfile.findMany({
      select: { slug: true, name: true, shortName: true, heatRating: true, overallScore: true, plotPriceMinSqYd: true, plotPriceMaxSqYd: true, aptPriceMinSqFt: true, aptPriceMaxSqFt: true, district: true, direction: true },
      orderBy: { overallScore: { sort: "desc", nulls: "last" } },
    }),
    prisma.infraProject.findMany({
      where: { isPublished: true, status: { not: "CANCELLED" } },
      select: { id: true, name: true, shortName: true, category: true, status: true, sourceAuthority: true, sourceUrl: true, estimatedCompletion: true, reImpactScore: true },
      orderBy: { name: "asc" },
    }),
    prisma.developer.findMany({ select: { slug: true, name: true, established: true, stats: true } }),
    prisma.newsArticle.findMany({
      where: { cityScope: "hyderabad" },
      select: { id: true, headline: true, sourceName: true, publishedAt: true, canonicalUrl: true, category: true },
      orderBy: { publishedAt: "desc" },
      take: 4,
    }),
    prisma.infraProject.count({ where: { isPublished: true } }),
  ]);

  const builders = developers
    .map((d) => ({ d, r: recordOf(d.stats) }))
    .filter((x) => x.r && x.r.stats.projects >= 4)
    .sort((a, b) => b.r!.stats.projects - a.r!.stats.projects)
    .slice(0, 6)
    .map(({ d, r }) => ({
      slug: d.slug,
      name: d.name,
      established: d.established,
      projects: r!.stats.projects,
      completed: r!.stats.completed,
      underConstruction: r!.stats.underConstruction,
      delays: r!.stats.overdue + r!.stats.extended + r!.stats.behindTarget,
      orders: r!.stats.regulatoryOrders,
    }));

  return {
    counts: { total, rera, land, plots, ready, underConstruction, scored, builders: developers.length, infra: infraTotal, corridors: corridors.length },
    picks: {
      topRated: topRated.map((r) => toCard(r, now)),
      ready: readyHomes.map((r) => toCard(r, now)),
      under1Cr: under1Cr.map((r) => toCard(r, now)),
      plots: plotList.map((r) => toCard(r, now)),
      land: landList.map((r) => toCard(r, now)),
    },
    budgets: BUDGET_TILES.map((b, i) => ({ label: b.label, sub: b.sub, href: b.href, count: budgetCounts[i] })),
    localities: localityRows.map((l) => ({ name: l.locality, count: Number(l.n) })),
    corridors,
    // Furthest along first: what's being built is more certain than what's announced.
    infra: [...infra].sort((a, b) => STAGE.indexOf(a.status) - STAGE.indexOf(b.status)),
    builders,
    news,
  };
}

export type HomeData = Awaited<ReturnType<typeof loadHome>>;
