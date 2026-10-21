/** GET /api/admin/site-visits?status=REQUESTED — site-visit requests (admin only). */
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import type { SiteVisitStatus } from "@prisma/client";

const STATUSES: SiteVisitStatus[] = ["REQUESTED", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"];

export async function GET(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.res;
  const status = new URL(req.url).searchParams.get("status");
  const visits = await prisma.siteVisit.findMany({
    where: status && STATUSES.includes(status as SiteVisitStatus) ? { status: status as SiteVisitStatus } : {},
    orderBy: [{ preferredDate: "asc" }],
    take: 300,
    include: { project: { select: { id: true, name: true, corridor: true } } },
  });
  return NextResponse.json({ visits });
}
