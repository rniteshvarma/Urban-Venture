/**
 * Data for the homepage's lower sections (budget tiles, localities, area
 * prices, builders, government projects, news). Every number comes from the
 * database — nothing is typed into the page.
 */
import type { NewsArticle, Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { projectWhere, type ProjectFilters } from "@/lib/projects/query";
import { recordOf } from "@/lib/developers/display";
import { buildFeedWhere } from "@/lib/news/query";
import { NEWS_CITY } from "@/lib/news/seed-cities";

const and = (f: ProjectFilters, ...extra: Prisma.ProjectWhereInput[]): Prisma.ProjectWhereInput => ({ AND: [projectWhere(f), ...extra] });

/** Budget shortcuts: label, the /projects link, and how many listings it opens. */
export const BUDGET_TILES: { label: string; sub: string; filters: ProjectFilters; href: string; extra?: Prisma.ProjectWhereInput }[] = [
  { label: "₹30 – 60 L", sub: "Flats", filters: { type: "Apartment", minBudget: 30, maxBudget: 60 }, href: "/projects?type=Apartment&budget=30-60L" },
  { label: "₹60 L – ₹1.2 Cr", sub: "Flats", filters: { type: "Apartment", minBudget: 60, maxBudget: 120 }, href: "/projects?type=Apartment&budget=60-120L" },
  { label: "Above ₹1.2 Cr", sub: "Flats & villas", filters: { minBudget: 120 }, href: "/projects?budget=%3E120L", extra: { propertyType: { in: ["Apartment", "Villa"] } } },
  { label: "Plots under ₹30 L", sub: "Open plots", filters: { type: "Plots", maxBudget: 30 }, href: "/projects?type=Plots&budget=%3C30L" },
  { label: "Plots ₹30 – 60 L", sub: "Open plots", filters: { type: "Plots", minBudget: 30, maxBudget: 60 }, href: "/projects?type=Plots&budget=30-60L" },
  { label: "Farm land", sub: "Near the RRR", filters: { type: "Land" }, href: "/projects?type=Land" },
];

// Furthest along first: what's being built is more certain than what's announced.
const STAGE = ["COMPLETE", "PARTIALLY_COMPLETE", "UNDER_CONSTRUCTION", "APPROVED", "LAND_ACQUISITION", "ANNOUNCED", "DELAYED"];

export interface HomeLocality { name: string; count: number; image: string | null; project: string | null }
export interface HomeBuilder {
  slug: string; name: string; established: number | null;
  projects: number; completed: number; delays: number; avgScore: number | null;
}

async function load() {
  const [total, scored, budgetCounts, localityRows, corridors, infra, infraTotal, developers, newsWhere] = await Promise.all([
    prisma.project.count({ where: projectWhere({}) }),
    prisma.project.count({ where: and({}, { tigerScore: { not: null } }) }),
    Promise.all(BUDGET_TILES.map((b) => prisma.project.count({ where: and(b.filters, ...(b.extra ? [b.extra] : [])) }))),
    // Busiest localities, each with the photo of its highest-scored project that has one.
    prisma.$queryRaw<{ locality: string; n: bigint; image: string | null; project: string | null }[]>`
      WITH pub AS (
        SELECT specifications->>'locality' AS locality, name, "imageUrls", "tigerScore"
        FROM "Project"
        WHERE status = 'ACTIVE' AND "listingStatus" = 'APPROVED' AND "reviewState" = 'PUBLISHED'
          AND specifications->>'listingKind' = 'PROJECT' AND specifications->>'locality' IS NOT NULL
      ),
      counts AS (SELECT locality, count(*) AS n FROM pub GROUP BY 1),
      pics AS (
        SELECT DISTINCT ON (locality) locality, "imageUrls"[1] AS image, name AS project
        FROM pub WHERE cardinality("imageUrls") > 0
        ORDER BY locality, "tigerScore" DESC NULLS LAST, name
      )
      SELECT c.locality, c.n, p.image, p.project FROM counts c LEFT JOIN pics p USING (locality)
      ORDER BY c.n DESC, c.locality LIMIT 10`,
    prisma.corridorProfile.findMany({
      where: { isPublished: true },
      select: { slug: true, name: true, district: true, heatRating: true, plotPriceMinSqYd: true, plotPriceMaxSqYd: true, aptPriceMinSqFt: true, aptPriceMaxSqFt: true },
      orderBy: { overallScore: { sort: "desc", nulls: "last" } },
      take: 8,
    }),
    prisma.infraProject.findMany({
      where: { isPublished: true, status: { not: "CANCELLED" } },
      select: { id: true, name: true, shortName: true, category: true, status: true, sourceAuthority: true, sourceUrl: true, estimatedCompletion: true },
      orderBy: { name: "asc" },
    }),
    prisma.infraProject.count({ where: { isPublished: true, status: { not: "CANCELLED" } } }),
    prisma.developer.findMany({ select: { slug: true, name: true, established: true, stats: true } }),
    buildFeedWhere({ cityScope: NEWS_CITY }),
  ]);

  const top = developers
    .map((d) => ({ d, r: recordOf(d.stats) }))
    .filter((x) => x.r && x.r.stats.projects >= 4)
    .sort((a, b) => b.r!.stats.projects - a.r!.stats.projects || a.d.name.localeCompare(b.d.name))
    .slice(0, 6);
  const avg = await prisma.project.groupBy({
    by: ["developerSlug"],
    where: and({}, { developerSlug: { in: top.map((x) => x.d.slug) }, tigerScore: { not: null } }),
    _avg: { tigerScore: true },
  });
  const avgBySlug = new Map(avg.map((a) => [a.developerSlug, a._avg.tigerScore]));
  const builders: HomeBuilder[] = top.map(({ d, r }) => ({
    slug: d.slug,
    name: d.name,
    established: d.established,
    projects: r!.stats.projects,
    completed: r!.stats.completed,
    delays: r!.stats.overdue + r!.stats.extended + r!.stats.behindTarget,
    avgScore: avgBySlug.get(d.slug) ?? null,
  }));

  const news: NewsArticle[] = await prisma.newsArticle.findMany({
    where: newsWhere,
    orderBy: [{ isPinned: "desc" }, { publishedAt: "desc" }, { id: "desc" }],
    take: 3,
  });
  const slugs = [...new Set(news.flatMap((a) => a.corridorSlugs))];
  const chipRows = slugs.length
    ? await prisma.corridorProfile.findMany({ where: { slug: { in: slugs } }, select: { slug: true, shortName: true, overallScore: true } })
    : [];

  return {
    counts: { total, scored, infra: infraTotal, builders: developers.length },
    budgets: BUDGET_TILES.map((b, i) => ({ label: b.label, sub: b.sub, href: b.href, count: budgetCounts[i] })),
    localities: localityRows.map((l): HomeLocality => ({ name: l.locality, count: Number(l.n), image: l.image, project: l.project })),
    corridors,
    infra: [...infra].sort((a, b) => STAGE.indexOf(a.status) - STAGE.indexOf(b.status)).slice(0, 6),
    builders,
    news,
    newsChips: chipRows.map((c) => ({ slug: c.slug, name: c.shortName, score: c.overallScore })),
  };
}

export type HomeSectionsData = Awaited<ReturnType<typeof load>>;

/** Null when the database can't be reached, so the rest of the homepage still renders. */
export async function loadHomeSections(): Promise<HomeSectionsData | null> {
  try {
    return await load();
  } catch (e) {
    console.error("[home] sections failed to load", e);
    return null;
  }
}
