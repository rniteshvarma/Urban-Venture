/**
 * GET /api/admin/market/observations?status=PENDING&source=NEWS
 * Market figures for the admin review queue (newest first).
 */
import { NextResponse, type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.res;
  const status = req.nextUrl.searchParams.get("status") ?? undefined;
  const source = req.nextUrl.searchParams.get("source") ?? undefined;
  const rows = await prisma.marketObservation.findMany({
    where: { ...(status ? { status } : {}), ...(source ? { source } : {}) },
    orderBy: { observedAt: "desc" },
    take: 200,
  });
  const counts = await prisma.marketObservation.groupBy({ by: ["source", "status"], _count: { _all: true }, _max: { observedAt: true } });
  return NextResponse.json({ rows, counts: counts.map((c) => ({ source: c.source, status: c.status, count: c._count._all, lastObservedAt: c._max.observedAt })) });
}
