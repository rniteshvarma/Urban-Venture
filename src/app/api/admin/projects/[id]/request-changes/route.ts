// POST /api/admin/projects/[id]/request-changes  { feedback, internalNote? }
// Sends the listing back to the seller with specific, actionable feedback —
// never a generic rejection.
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
  const feedback = String(body.feedback ?? "").trim();
  const internalNote = body.internalNote ? String(body.internalNote).trim() : null;
  if (!feedback) return NextResponse.json({ error: "Specific feedback for the seller is required." }, { status: 400 });

  const listing = await prisma.project.findFirst({ where: { id, listingSource: "SELLER" }, select: { id: true, listingStatus: true } });
  if (!listing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (listing.listingStatus !== "PENDING_REVIEW") {
    return NextResponse.json({ error: "Only a submitted listing can have changes requested." }, { status: 409 });
  }

  await prisma.project.update({
    where: { id },
    data: { listingStatus: "CHANGES_REQUESTED", status: "UPCOMING", sellerFeedback: feedback, reviewNote: internalNote, reviewedBy: session.user.id },
  });
  await logListingActivity(id, "CHANGES_REQUESTED", { id: session.user.id, role: "ADMIN" }, feedback);

  return NextResponse.json({ ok: true, listingStatus: "CHANGES_REQUESTED" });
}
