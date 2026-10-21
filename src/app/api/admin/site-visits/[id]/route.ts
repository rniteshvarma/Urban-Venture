/** PATCH /api/admin/site-visits/[id] — confirm, complete or cancel a visit (admin only). */
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import type { SiteVisitStatus } from "@prisma/client";

const STATUSES: SiteVisitStatus[] = ["REQUESTED", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"];

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.res;
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const status = body.status as SiteVisitStatus | undefined;
  if (status && !STATUSES.includes(status)) return NextResponse.json({ error: "Unknown status" }, { status: 400 });
  const confirmedFor = body.confirmedFor ? new Date(body.confirmedFor) : undefined;
  if (confirmedFor && Number.isNaN(confirmedFor.getTime())) return NextResponse.json({ error: "Bad date" }, { status: 400 });
  const visit = await prisma.siteVisit.update({
    where: { id },
    data: { ...(status ? { status } : {}), ...(confirmedFor ? { confirmedFor } : {}), ...(typeof body.adminNote === "string" ? { adminNote: body.adminNote.slice(0, 1000) } : {}) },
  }).catch(() => null);
  if (!visit) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ visit });
}
