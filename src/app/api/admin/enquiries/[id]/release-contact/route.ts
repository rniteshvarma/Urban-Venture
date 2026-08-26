// POST /api/admin/enquiries/[id]/release-contact — admin releases the buyer's
// contact to the seller (after qualifying the buyer). This is the ONLY way
// contactReleased flips to true.
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  const enq = await prisma.listingEnquiry.findUnique({ where: { id }, select: { id: true } });
  if (!enq) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.listingEnquiry.update({ where: { id }, data: { contactReleased: true } });
  return NextResponse.json({ ok: true });
}
