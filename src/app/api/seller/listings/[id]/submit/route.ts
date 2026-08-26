// POST /api/seller/listings/[id]/submit — validate + submit for admin review.
// Saving never validates; submitting always does (Part 5, Constraint 9).
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireSeller } from "@/lib/listings/api";
import { publishBlockers, type ListingFields } from "@/lib/listings/requirements";
import { activeListingCount, logListingActivity, needsAuthorisationDoc } from "@/lib/listings/seller";
import { scoreAndPersist } from "@/lib/listings/score-io";

const PHOTO_TYPES = new Set(["SITE_PHOTO", "INTERIOR_RENDER", "ELEVATION", "AMENITY", "LOCATION_MAP"]);
const PLAN_TYPES = new Set(["MASTER_PLAN", "FLOOR_PLAN", "UNIT_PLAN"]);

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireSeller();
  if (!auth.ok) return auth.res;
  const { id } = await ctx.params;

  const listing = await prisma.project.findFirst({
    where: { id, ownerId: auth.userId, listingSource: "SELLER" },
    include: { media: true },
  });
  if (!listing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!["DRAFT", "CHANGES_REQUESTED"].includes(listing.listingStatus)) {
    return NextResponse.json({ error: "This listing has already been submitted." }, { status: 409 });
  }

  const active = listing.media.filter((m) => !m.isRejected);
  const fields: ListingFields = {
    propertyType: listing.propertyType,
    villageId: listing.villageId,
    surveyNumbers: listing.surveyNumbers,
    pinInsideVillage: listing.pinInsideVillage,
    latitude: listing.latitude,
    longitude: listing.longitude,
    totalAreaSqYd: listing.totalAreaSqYd,
    totalPlots: listing.totalPlots,
    availablePlots: listing.availablePlots,
    plotSizesSqYd: listing.plotSizesSqYd,
    ownershipType: listing.ownershipType,
    landClassification: listing.landClassification,
    approvalStatus: listing.approvalStatus,
    minBudgetLakhs: listing.minBudgetLakhs,
    maxBudgetLakhs: listing.maxBudgetLakhs,
    description: listing.description,
    photoCount: active.filter((m) => PHOTO_TYPES.has(m.mediaType)).length,
    hasLayoutOrFloorPlan: active.some((m) => PLAN_TYPES.has(m.mediaType)),
  };

  const blockers = publishBlockers(fields, {
    sellerSuspended: auth.profile.isSuspended,
    activeListingCount: await activeListingCount(auth.userId),
    maxActiveListings: auth.profile.maxActiveListings,
    needsAuthorisationDoc: needsAuthorisationDoc(auth.profile.sellerType),
    hasAuthorisationDoc: listing.media.some((m) => !m.isPublic),
  });
  if (blockers.length > 0) return NextResponse.json({ error: "Listing not ready", blockers }, { status: 422 });

  await prisma.project.update({
    where: { id },
    data: { listingStatus: "PENDING_REVIEW", submittedAt: new Date(), sellerFeedback: null },
  });

  // Compute the score now; buyer matching runs on approval, when the listing
  // becomes ACTIVE (the existing engine only matches ACTIVE projects).
  await scoreAndPersist(id).catch((e) => console.error("scoreAndPersist failed", e));
  await logListingActivity(id, "SUBMITTED", { id: auth.userId, role: "SELLER" });

  return NextResponse.json({ ok: true, listingStatus: "PENDING_REVIEW" });
}
