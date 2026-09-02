// PATCH /api/admin/sellers/[id] — verify or suspend a seller.
//
// Verification is what lets a seller's listings carry the verified badge;
// suspension is the lever for sellers who post bad inventory. Both are admin
// decisions, so they live here rather than anywhere a seller can reach.
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.res;

  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));

  const profile = await prisma.sellerProfile.findUnique({ where: { id }, select: { id: true } });
  if (!profile) return NextResponse.json({ error: "Seller not found" }, { status: 404 });

  const data: Record<string, unknown> = {};

  if (typeof body.isVerified === "boolean") {
    data.isVerified = body.isVerified;
    data.verifiedAt = body.isVerified ? new Date() : null;
  }

  if (typeof body.isSuspended === "boolean") {
    data.isSuspended = body.isSuspended;
    // A suspension without a reason is not actionable for whoever reviews it later.
    data.suspendReason = body.isSuspended ? (body.suspendReason || "Suspended by admin") : null;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const updated = await prisma.sellerProfile.update({ where: { id }, data });
  return NextResponse.json({ ok: true, seller: { id: updated.id, isVerified: updated.isVerified, isSuspended: updated.isSuspended } });
}
