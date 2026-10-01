// GET  /api/admin/concierge/conversations/[id] — transcript + profile
// POST /api/admin/concierge/conversations/[id] — { action: "takeover" | "handback" | "reply", text? }
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { agentReply, corridorOptions, handBack, takeOver } from "@/lib/concierge/service";
import type { Slots } from "@/lib/concierge/types";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.res;
  const { id } = await params;
  const conv = await prisma.conciergeConversation.findUnique({
    where: { id },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
      lead: { select: { id: true, name: true, persona: true, personaReason: true, leadScore: true, leadScoreGrade: true, status: true } },
    },
  });
  if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const corridors = await corridorOptions();
  const slots = (conv.slots as Slots) ?? {};
  return NextResponse.json({
    ...conv,
    areaNames: (slots.areas ?? []).map((a) => corridors.find((c) => c.slug === a)?.shortName ?? a),
    windowOpen: !!conv.lastInboundAt && Date.now() - conv.lastInboundAt.getTime() < 24 * 3600_000,
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.res;
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { action?: string; text?: string };
  if (body.action === "takeover") await takeOver(id);
  else if (body.action === "handback") await handBack(id);
  else if (body.action === "reply") {
    const text = body.text?.trim();
    if (!text) return NextResponse.json({ error: "Message is empty" }, { status: 400 });
    const r = await agentReply(id, text.slice(0, 4000));
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: 422 });
  } else return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  return NextResponse.json({ ok: true });
}
