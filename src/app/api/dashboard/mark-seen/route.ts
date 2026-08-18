import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";

/** Stamp lastDashboardVisitAt — called by the client AFTER the dashboard renders. */
export async function POST() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await prisma.user.update({ where: { id: userId }, data: { lastDashboardVisitAt: new Date() } });
  return NextResponse.json({ success: true });
}
