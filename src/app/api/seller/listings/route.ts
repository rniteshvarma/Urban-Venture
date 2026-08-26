// GET  /api/seller/listings?status=  — the seller's own listings
// POST /api/seller/listings           — create a blank DRAFT listing
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireSeller } from "@/lib/listings/api";
import { logListingActivity } from "@/lib/listings/seller";

export async function GET(req: Request) {
  const auth = await requireSeller();
  if (!auth.ok) return auth.res;

  const status = new URL(req.url).searchParams.get("status");
  const where: { ownerId: string; listingSource: "SELLER"; listingStatus?: "DRAFT" | "PENDING_REVIEW" | "CHANGES_REQUESTED" | "APPROVED" | "PAUSED" | "EXPIRED" | "SOLD" | "REJECTED" } = {
    ownerId: auth.userId,
    listingSource: "SELLER",
  };
  if (status) where.listingStatus = status as typeof where.listingStatus;

  const listings = await prisma.project.findMany({
    where,
    orderBy: [{ updatedAt: "desc" }],
    include: {
      _count: { select: { enquiries: true, media: true } },
    },
  });

  // Summary strip counts
  const grouped = await prisma.project.groupBy({
    by: ["listingStatus"],
    where: { ownerId: auth.userId, listingSource: "SELLER" },
    _count: true,
  });
  const counts: Record<string, number> = {};
  for (const g of grouped) counts[g.listingStatus] = g._count;

  const scored = listings.filter((l) => l.listingScore != null);
  const avgScore = scored.length ? Math.round(scored.reduce((s, l) => s + (l.listingScore ?? 0), 0) / scored.length) : null;

  return NextResponse.json({ listings, counts, avgScore });
}

export async function POST() {
  const auth = await requireSeller();
  if (!auth.ok) return auth.res;

  const listing = await prisma.project.create({
    data: {
      // seller ownership + lifecycle
      ownerId: auth.userId,
      listingSource: "SELLER",
      listingStatus: "DRAFT",
      status: "UPCOMING", // keeps drafts out of public status:ACTIVE queries
      reviewState: "DRAFT",
      // required Project fields — sensible placeholders until the wizard fills them
      name: "Untitled listing",
      developer: auth.profile.displayName,
      corridor: "",
      city: "Hyderabad",
      minBudgetLakhs: 0,
      maxBudgetLakhs: 0,
      minHorizonYears: 3,
      maxHorizonYears: 7,
      riskLevel: "MEDIUM",
      propertyType: "Plots",
      description: "",
      surveyNumbers: [],
    },
  });
  await logListingActivity(listing.id, "EDITED", { id: auth.userId, role: "SELLER" }, "Draft created");
  return NextResponse.json({ id: listing.id, listing });
}
