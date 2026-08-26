// POST /api/seller/listings/[id]/mark-sold — seller marks the property sold.
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
  if (["SOLD", "DRAFT", "REJECTED"].includes(listing.listingStatus)) {
    return NextResponse.json({ error: "This listing can't be marked sold." }, { status: 409 });
  }

  await prisma.project.update({
    where: { id },
    data: { listingStatus: "SOLD", soldAt: new Date(), status: "SOLD_OUT" },
  });
  await logListingActivity(id, "SOLD", { id: auth.userId, role: "SELLER" });
  return NextResponse.json({ ok: true, listingStatus: "SOLD" });
}
