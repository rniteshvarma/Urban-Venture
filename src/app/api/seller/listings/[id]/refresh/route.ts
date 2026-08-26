// POST /api/seller/listings/[id]/refresh — seller confirms still available:
// reset the 90-day expiry, bump the freshness component, re-score. An EXPIRED
// listing comes back live.
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireSeller, ownedListing } from "@/lib/listings/api";
import { expiryFrom, logListingActivity } from "@/lib/listings/seller";
import { scoreAndPersist } from "@/lib/listings/score-io";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireSeller();
  if (!auth.ok) return auth.res;
  const { id } = await ctx.params;

  const listing = await ownedListing(auth.userId, id);
  if (!listing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!["APPROVED", "PAUSED", "EXPIRED"].includes(listing.listingStatus)) {
    return NextResponse.json({ error: "This listing can't be refreshed in its current state." }, { status: 409 });
  }

  const now = new Date();
  const reviving = listing.listingStatus === "EXPIRED";
  await prisma.project.update({
    where: { id },
    data: {
      lastRefreshedAt: now,
      expiresAt: expiryFrom(now),
      ...(reviving ? { listingStatus: "APPROVED", status: "ACTIVE" } : {}),
    },
  });
  await scoreAndPersist(id).catch((e) => console.error("rescore after refresh failed", e));
  await logListingActivity(id, "REFRESHED", { id: auth.userId, role: "SELLER" });
  return NextResponse.json({ ok: true, expiresAt: expiryFrom(now) });
}
