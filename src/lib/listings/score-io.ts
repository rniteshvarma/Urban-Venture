// DB-facing layer for the listing score. Gathers inputs from existing tables,
// runs the pure scorer (score.ts), and persists listingScore / scoreBreakdown.
// This is the only place score.ts touches the database.

import prisma from "@/lib/prisma";
import { lakhToRupees } from "@/lib/format";
import { computeListingScore, deriveImprovements, type ListingScoreInput, type ListingScoreBreakdown, type Improvement } from "./score";
import { fairValueForListing } from "./fair-value";

// Media types that count as "photos" for the quality component
const PHOTO_TYPES = new Set(["SITE_PHOTO", "INTERIOR_RENDER", "ELEVATION", "AMENITY", "LOCATION_MAP"]);
const PLAN_TYPES = new Set(["MASTER_PLAN", "FLOOR_PLAN", "UNIT_PLAN"]);

/** RERA is not required for plotted/land sales below the notified thresholds. */
function reraNotRequired(propertyType: string | null): boolean {
  const t = (propertyType ?? "").toLowerCase();
  return t.includes("plot") || t.includes("land") || t.includes("agri");
}

function isBoilerplate(desc: string): boolean {
  const d = desc.trim().toLowerCase();
  if (d.length < 40) return true;
  // very low lexical variety → templated filler
  const words = d.split(/\s+/);
  const unique = new Set(words);
  return unique.size / Math.max(words.length, 1) < 0.4;
}

type ProjectForScore = NonNullable<Awaited<ReturnType<typeof loadProject>>>;

function loadProject(projectId: string) {
  return prisma.project.findUnique({
    where: { id: projectId },
    include: {
      media: true,
      village: { select: { landIQScore: true } },
      owner: { select: { sellerProfile: { select: { isVerified: true, totalEnquiries: true, respondedEnquiries: true } } } },
    },
  });
}

export async function buildScoreInput(p: ProjectForScore): Promise<ListingScoreInput> {
  // Location: prefer village LandIQ score, else corridor overallScore
  let corridorOverallScore: number | null = null;
  if (p.village?.landIQScore == null && p.corridor) {
    const cp = await prisma.corridorProfile.findFirst({
      where: { OR: [{ name: p.corridor }, { shortName: p.corridor }, { slug: p.corridor.toLowerCase() }] },
      select: { overallScore: true },
    });
    corridorOverallScore = cp?.overallScore ?? null;
  }

  // Price: asking rate per sq.yd from total price / total area
  const priceLakh = p.maxBudgetLakhs || p.minBudgetLakhs || 0;
  const askingRatePerSqYd = p.totalAreaSqYd && p.totalAreaSqYd > 0 && priceLakh > 0 ? lakhToRupees(priceLakh) / p.totalAreaSqYd : null;
  const fv = await fairValueForListing({ villageId: p.villageId, corridor: p.corridor });

  const media = p.media.filter((m) => !m.isRejected);
  const photoCount = media.filter((m) => PHOTO_TYPES.has(m.mediaType)).length;
  const hasLayoutOrFloorPlan = media.some((m) => PLAN_TYPES.has(m.mediaType));
  const hasVideo = media.some((m) => m.mimeType?.startsWith("video/"));
  // Ownership document = a private media row an admin has cleared
  const ownershipDocApproved = p.media.some((m) => !m.isPublic && m.rightsStatus === "CLEARED");

  const sp = p.owner?.sellerProfile;

  return {
    villageLandIQScore: p.village?.landIQScore ?? null,
    corridorOverallScore,
    askingRatePerSqYd,
    fairValueP50PerSqYd: fv.p50PerSqYd,
    photoCount,
    hasLayoutOrFloorPlan,
    descriptionLength: (p.description ?? "").length,
    descriptionIsBoilerplate: isBoilerplate(p.description ?? ""),
    requiredFieldsComplete: requiredComplete(p),
    hasPlotDimensions: (p.plotSizesSqYd?.length ?? 0) > 0,
    hasVideo,
    approvalVerified: p.approvalVerified,
    ownershipDocApproved,
    reraVerifiedOrNotRequired: p.reraVerified || (!p.reraNumber && reraNotRequired(p.propertyType)),
    sellerVerified: sp?.isVerified ?? false,
    lastRefreshedAt: p.lastRefreshedAt ?? p.approvedAt ?? null,
    respondedEnquiries: sp?.respondedEnquiries ?? 0,
    totalEnquiries: sp?.totalEnquiries ?? 0,
    lastEditedAt: p.updatedAt ?? null,
  };
}

function requiredComplete(p: ProjectForScore): boolean {
  const common = !!p.approvalStatus && (p.surveyNumbers?.length ?? 0) > 0 && (p.maxBudgetLakhs || p.minBudgetLakhs) > 0 && !!p.description;
  const t = (p.propertyType ?? "").toLowerCase();
  if (t.includes("plot")) return common && !!p.totalAreaSqYd && ((p.totalPlots ?? 0) > 0 || (p.plotSizesSqYd?.length ?? 0) > 0);
  return common && !!p.totalAreaSqYd;
}

export interface ScoredResult {
  breakdown: ListingScoreBreakdown;
  improvements: Improvement[];
}

/** Compute the score for a project and persist it. Idempotent. */
export async function scoreAndPersist(projectId: string): Promise<ScoredResult | null> {
  const p = await loadProject(projectId);
  if (!p) return null;
  const input = await buildScoreInput(p);
  const breakdown = computeListingScore(input);
  const improvements = deriveImprovements(input, breakdown);

  await prisma.project.update({
    where: { id: projectId },
    data: {
      listingScore: breakdown.total,
      scoreBreakdown: breakdown as unknown as object,
      scoredAt: new Date(),
    },
  });
  return { breakdown, improvements };
}

/** Compute without persisting — for the live preview in the post flow. */
export async function scorePreview(projectId: string): Promise<ScoredResult | null> {
  const p = await loadProject(projectId);
  if (!p) return null;
  const input = await buildScoreInput(p);
  const breakdown = computeListingScore(input);
  return { breakdown, improvements: deriveImprovements(input, breakdown) };
}
