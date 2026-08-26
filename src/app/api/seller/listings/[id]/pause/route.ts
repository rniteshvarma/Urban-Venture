// POST /api/seller/listings/[id]/pause — toggle APPROVED <-> PAUSED.
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireSeller, ownedListing } from "@/lib/listings/api";
import { logListingActivity } from "@/lib/listings/seller";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireSeller();
  if (!auth.ok) return auth.res;
  const { id } = await ctx.params;

  const listing = await ownedListing(auth.userId, id);
  if (!listing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!["APPROVED", "PAUSED"].includes(listing.listingStatus)) {
    return NextResponse.json({ error: "Only a live or paused listing can be paused/resumed." }, { status: 409 });
  }

  const pausing = listing.listingStatus === "APPROVED";
  await prisma.project.update({
    where: { id },
    data: { listingStatus: pausing ? "PAUSED" : "APPROVED", status: pausing ? "UPCOMING" : "ACTIVE" },
  });
  await logListingActivity(id, pausing ? "PAUSED" : "RESUMED", { id: auth.userId, role: "SELLER" });
  return NextResponse.json({ ok: true, listingStatus: pausing ? "PAUSED" : "APPROVED" });
}
