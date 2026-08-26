// GET /api/seller/listings/[id]/performance — 8-week score/views/enquiry trend
// with locality benchmarks, plus 12-month locality supply & demand.
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireSeller, ownedListing } from "@/lib/listings/api";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireSeller();
  if (!auth.ok) return auth.res;
  const { id } = await ctx.params;

  const listing = await ownedListing(auth.userId, id);
  if (!listing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const snapshots = await prisma.listingScoreSnapshot.findMany({
    where: { projectId: id },
    orderBy: { capturedAt: "asc" },
    take: 8,
  });

  // Locality supply & demand: other approved seller listings in the same village
  let localitySupply = 0;
  let localityEnquiries = 0;
  if (listing.villageId) {
    localitySupply = await prisma.project.count({
      where: { villageId: listing.villageId, listingSource: "SELLER", listingStatus: "APPROVED", id: { not: id } },
    });
    const agg = await prisma.project.aggregate({
      where: { villageId: listing.villageId, listingSource: "SELLER" },
      _sum: { enquiryCount: true },
    });
    localityEnquiries = agg._sum.enquiryCount ?? 0;
  }

  return NextResponse.json({
    current: { viewCount: listing.viewCount, enquiryCount: listing.enquiryCount, listingScore: listing.listingScore },
    snapshots,
    locality: { activeListings: localitySupply, totalEnquiries: localityEnquiries },
  });
}
