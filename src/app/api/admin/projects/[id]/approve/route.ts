// POST /api/admin/projects/[id]/approve — approve a seller listing.
// Sets it live, stamps the 90-day expiry, re-scores, and runs buyer matching
// (now that the listing is ACTIVE).
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { expiryFrom, logListingActivity } from "@/lib/listings/seller";
import { scoreAndPersist } from "@/lib/listings/score-io";
import { runMatchingForProject } from "@/lib/matching-engine";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  const listing = await prisma.project.findFirst({ where: { id, listingSource: "SELLER" }, select: { id: true, listingStatus: true } });
  if (!listing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!["PENDING_REVIEW", "CHANGES_REQUESTED"].includes(listing.listingStatus)) {
    return NextResponse.json({ error: "Only a submitted listing can be approved." }, { status: 409 });
  }

  const now = new Date();
  await prisma.project.update({
    where: { id },
    data: {
      listingStatus: "APPROVED",
      status: "ACTIVE",
      reviewState: "PUBLISHED",
      approvedAt: now,
      expiresAt: expiryFrom(now),
      lastRefreshedAt: now,
      reviewedBy: session.user.id,
      sellerFeedback: null,
      rejectReason: null,
    },
  });

  await scoreAndPersist(id).catch((e) => console.error("scoreAndPersist failed", e));
  await runMatchingForProject(id).catch((e) => console.error("runMatchingForProject failed", e));
  await logListingActivity(id, "APPROVED", { id: session.user.id, role: "ADMIN" });

  return NextResponse.json({ ok: true, listingStatus: "APPROVED" });
}
