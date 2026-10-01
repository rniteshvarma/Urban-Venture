/**
 * GET /api/reports/unsubscribe/[token] — one-click unsubscribe from the weekly
 * report (the link in every report and notification). No login required: the
 * token is the per-user secret `ReportPreference.unsubToken`.
 */
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const pref = await prisma.reportPreference.findUnique({ where: { unsubToken: token }, select: { id: true } });
  const url = new URL("/reports/unsubscribed", req.url);
  if (!pref) {
    url.searchParams.set("status", "invalid");
    return NextResponse.redirect(url);
  }
  await prisma.reportPreference.update({
    where: { id: pref.id },
    data: { unsubscribedAt: new Date(), isActive: false, frequency: "PAUSED" },
  });
  return NextResponse.redirect(url);
}
