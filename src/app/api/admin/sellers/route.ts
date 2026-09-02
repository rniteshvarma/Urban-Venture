// GET /api/admin/sellers — every seller on the platform, with the numbers an
// admin needs to judge them: how many listings they have and in what state,
// how many enquiries they have received, and how responsive they are.
//
// Sellers are the third party the CRM manages alongside customers and
// properties; without this they were only reachable one listing at a time.
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.res;

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search");
  const state = searchParams.get("state"); // verified | unverified | suspended

  const where: Record<string, unknown> = {};
  if (state === "verified") where.isVerified = true;
  if (state === "unverified") where.isVerified = false;
  if (state === "suspended") where.isSuspended = true;
  if (search) {
    where.OR = [
      { displayName: { contains: search, mode: "insensitive" } },
      { firmName: { contains: search, mode: "insensitive" } },
      { user: { email: { contains: search, mode: "insensitive" } } },
    ];
  }

  const profiles = await prisma.sellerProfile.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { user: { select: { id: true, name: true, email: true, phone: true, lastLoginAt: true } } },
  });

  // Listing counts per owner, grouped in one query rather than per seller.
  const ownerIds = profiles.map((p) => p.userId);
  const listings = ownerIds.length
    ? await prisma.project.groupBy({
        by: ["ownerId", "listingStatus"],
        where: { ownerId: { in: ownerIds }, listingSource: "SELLER" },
        _count: { _all: true },
      })
    : [];

  const byOwner = new Map<string, Record<string, number>>();
  for (const row of listings) {
    if (!row.ownerId) continue;
    const bucket = byOwner.get(row.ownerId) ?? {};
    bucket[row.listingStatus] = row._count._all;
    byOwner.set(row.ownerId, bucket);
  }

  const sellers = profiles.map((p) => {
    const counts = byOwner.get(p.userId) ?? {};
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    const responseRate =
      p.totalEnquiries > 0 ? Math.round((p.respondedEnquiries / p.totalEnquiries) * 100) : null;
    return {
      id: p.id,
      userId: p.userId,
      displayName: p.displayName,
      firmName: p.firmName,
      sellerType: p.sellerType,
      reraAgentNumber: p.reraAgentNumber,
      isVerified: p.isVerified,
      isSuspended: p.isSuspended,
      suspendReason: p.suspendReason,
      createdAt: p.createdAt,
      contact: { name: p.user.name, email: p.user.email, phone: p.user.phone },
      lastLoginAt: p.user.lastLoginAt,
      listings: {
        total,
        draft: counts.DRAFT ?? 0,
        pending: counts.PENDING_REVIEW ?? 0,
        live: counts.APPROVED ?? 0,
        rejected: counts.REJECTED ?? 0,
      },
      totalEnquiries: p.totalEnquiries,
      respondedEnquiries: p.respondedEnquiries,
      responseRate,
      avgResponseHours: p.avgResponseHours,
    };
  });

  return NextResponse.json({
    sellers,
    counts: {
      total: sellers.length,
      verified: sellers.filter((s) => s.isVerified).length,
      suspended: sellers.filter((s) => s.isSuspended).length,
      pendingListings: sellers.reduce((n, s) => n + s.listings.pending, 0),
    },
  });
}
