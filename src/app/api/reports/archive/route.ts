// GET /api/reports/archive — the signed-in user's past reports, for the
// dashboard archive (login required; permanent list even after tokens expire).
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const reports = await prisma.weeklyReport.findMany({
    where: { userId, status: { in: ["GENERATED", "SENT"] } },
    orderBy: { issueNumber: "desc" },
    select: { id: true, issueNumber: true, periodStart: true, periodEnd: true, headline: true, itemCount: true, accessToken: true, expiresAt: true, viewCount: true },
    take: 52,
  });

  const now = Date.now();
  return NextResponse.json({
    reports: reports.map((r) => ({
      issueNumber: r.issueNumber,
      periodStart: r.periodStart,
      periodEnd: r.periodEnd,
      headline: r.headline,
      itemCount: r.itemCount,
      viewCount: r.viewCount,
      // Live link only while the token is valid; otherwise the archive shows it read-only.
      url: r.expiresAt.getTime() > now ? `/report/${r.accessToken}` : null,
      expired: r.expiresAt.getTime() <= now,
    })),
  });
}
