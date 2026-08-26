// POST /api/seller/enquiries/[id]/viewed — mark an enquiry as viewed.
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireSeller } from "@/lib/listings/api";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireSeller();
  if (!auth.ok) return auth.res;
  const { id } = await ctx.params;

  const enq = await prisma.listingEnquiry.findFirst({
    where: { id, project: { ownerId: auth.userId, listingSource: "SELLER" } },
  });
  if (!enq) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!enq.sellerViewedAt) {
    await prisma.listingEnquiry.update({
      where: { id },
      data: { sellerViewedAt: new Date(), status: enq.status === "NEW" ? "VIEWED" : enq.status },
    });
  }
  return NextResponse.json({ ok: true });
}
