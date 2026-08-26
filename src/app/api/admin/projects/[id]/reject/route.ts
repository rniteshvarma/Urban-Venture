// POST /api/admin/projects/[id]/reject  { reason }
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { logListingActivity } from "@/lib/listings/seller";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  const body = await req.json().catch(() => ({}));
  const reason = String(body.reason ?? "").trim();
  if (!reason) return NextResponse.json({ error: "A rejection reason is required." }, { status: 400 });

  const listing = await prisma.project.findFirst({ where: { id, listingSource: "SELLER" }, select: { id: true } });
  if (!listing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.project.update({
    where: { id },
    data: { listingStatus: "REJECTED", status: "ARCHIVED", rejectReason: reason, reviewedBy: session.user.id },
  });
  await logListingActivity(id, "REJECTED", { id: session.user.id, role: "ADMIN" }, reason);

  return NextResponse.json({ ok: true, listingStatus: "REJECTED" });
}
