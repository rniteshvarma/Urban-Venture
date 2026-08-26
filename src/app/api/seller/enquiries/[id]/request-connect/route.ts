// POST /api/seller/enquiries/[id]/request-connect — seller asks our team to
// connect them with this buyer. Logs an internal task (ListingActivity) for the
// assigned agent; contact is released later by an admin from the CRM.
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireSeller } from "@/lib/listings/api";
import { logListingActivity } from "@/lib/listings/seller";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireSeller();
  if (!auth.ok) return auth.res;
  const { id } = await ctx.params;

  const enq = await prisma.listingEnquiry.findFirst({
    where: { id, project: { ownerId: auth.userId, listingSource: "SELLER" } },
  });
  if (!enq) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await logListingActivity(enq.projectId, "EDITED", { id: auth.userId, role: "SELLER" }, `Connect requested for enquiry ${enq.id} (${enq.buyerName})`);
  if (!enq.sellerViewedAt) {
    await prisma.listingEnquiry.update({ where: { id }, data: { sellerViewedAt: new Date(), status: enq.status === "NEW" ? "VIEWED" : enq.status } });
  }
  return NextResponse.json({ ok: true, message: "Our advisor will reach out to qualify and connect this buyer." });
}
