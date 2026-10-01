// PATCH /api/admin/whatsapp/alerts/[id] — acknowledge an alert.
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

export async function PATCH(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.res;
  const { id } = await params;
  await prisma.whatsAppAlert.updateMany({ where: { id, acknowledgedAt: null }, data: { acknowledgedAt: new Date() } });
  return NextResponse.json({ success: true });
}
