// POST   /api/admin/concierge/simulate — chat with the concierge as a customer,
//        through the real engine, without WhatsApp. { phone, name, text?, optionId? }
// DELETE /api/admin/concierge/simulate?phone= — start the simulator over
import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { handleConciergeInbound } from "@/lib/concierge/service";
import { toE164 } from "@/lib/whatsapp/phone";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const schema = z.object({
  phone: z.string().min(8),
  name: z.string().trim().max(60).optional(),
  text: z.string().max(2000).optional(),
  optionId: z.string().max(80).optional(),
});

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.res;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const p = parsed.data;
  const phone = toE164(p.phone);
  if (!phone) return NextResponse.json({ error: "Enter a valid phone number" }, { status: 400 });
  if (!p.text?.trim() && !p.optionId) return NextResponse.json({ error: "Type a message" }, { status: 400 });

  const result = await handleConciergeInbound({ phone, text: p.text, optionId: p.optionId, senderName: p.name || null, channel: "SIMULATOR" });
  const conv = await prisma.conciergeConversation.findUnique({ where: { id: result.conversationId }, select: { state: true, leadId: true, reportUrl: true, step: true } });
  return NextResponse.json({ ...result, ...conv });
}

export async function DELETE(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.res;
  const phone = toE164(new URL(req.url).searchParams.get("phone") ?? "");
  if (!phone) return NextResponse.json({ error: "phone required" }, { status: 400 });
  // Only simulator conversations; leads it created stay in the CRM (source "concierge-simulator").
  const r = await prisma.conciergeConversation.deleteMany({ where: { phone, channel: "SIMULATOR" } });
  return NextResponse.json({ deleted: r.count });
}
