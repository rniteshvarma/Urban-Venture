// GET   /api/seller/listings/[id] — one listing (+ completion, score if present)
// PATCH /api/seller/listings/[id] — autosave a partial edit. Never validates.
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireSeller, ownedListing } from "@/lib/listings/api";
import { completionPercent, type ListingFields } from "@/lib/listings/requirements";
import { fairValueForListing } from "@/lib/listings/fair-value";

// Fields a seller may set via autosave. Everything else (status, score,
// ownership, verification flags) is server-controlled.
const STR = ["name", "corridor", "city", "propertyType", "description", "riskLevel", "villageId", "ownershipType", "landClassification", "approvalStatus", "approvalNumber", "reraNumber"] as const;
const NUM = ["minBudgetLakhs", "maxBudgetLakhs", "minHorizonYears", "maxHorizonYears", "totalAreaSqYd", "totalPlots", "availablePlots", "roadWidthFeet", "latitude", "longitude"] as const;
const STR_ARR = ["surveyNumbers", "facingOptions", "imageUrls"] as const;
const NUM_ARR = ["plotSizesSqYd"] as const;

function mediaCounts(media: { mediaType: string; isRejected: boolean; isPublic: boolean }[]) {
  const active = media.filter((m) => !m.isRejected);
  const photoTypes = new Set(["SITE_PHOTO", "INTERIOR_RENDER", "ELEVATION", "AMENITY", "LOCATION_MAP"]);
  const planTypes = new Set(["MASTER_PLAN", "FLOOR_PLAN", "UNIT_PLAN"]);
  return {
    photoCount: active.filter((m) => photoTypes.has(m.mediaType)).length,
    hasLayoutOrFloorPlan: active.some((m) => planTypes.has(m.mediaType)),
  };
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireSeller();
  if (!auth.ok) return auth.res;
  const { id } = await ctx.params;

  const listing = await prisma.project.findFirst({
    where: { id, ownerId: auth.userId, listingSource: "SELLER" },
    include: { media: true, activityLog: { orderBy: { createdAt: "desc" }, take: 20 } },
  });
  if (!listing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const mc = mediaCounts(listing.media);
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
    photoCount: mc.photoCount,
    hasLayoutOrFloorPlan: mc.hasLayoutOrFloorPlan,
  };

  const fairValue = await fairValueForListing({ villageId: listing.villageId, corridor: listing.corridor });
  return NextResponse.json({ listing, completion: completionPercent(fields), fairValue });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireSeller();
  if (!auth.ok) return auth.res;
  const { id } = await ctx.params;

  const existing = await ownedListing(auth.userId, id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  // Only editable while the seller controls it
  if (!["DRAFT", "CHANGES_REQUESTED", "PAUSED"].includes(existing.listingStatus)) {
    return NextResponse.json({ error: "This listing can't be edited in its current state." }, { status: 409 });
  }

  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  for (const k of STR) if (k in body) data[k] = body[k] == null ? null : String(body[k]);
  for (const k of NUM) if (k in body) data[k] = body[k] == null || body[k] === "" ? null : Number(body[k]);
  for (const k of STR_ARR) if (k in body && Array.isArray(body[k])) data[k] = body[k].map(String);
  for (const k of NUM_ARR) if (k in body && Array.isArray(body[k])) data[k] = body[k].map(Number).filter((n: number) => !Number.isNaN(n));

  const updated = await prisma.project.update({ where: { id }, data });
  return NextResponse.json({ ok: true, listing: updated });
}
