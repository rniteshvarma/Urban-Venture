// GET /api/admin/concierge/conversations — the concierge inbox, plus the
// question-by-question funnel for the last 30 days.
import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import type { Slots } from "@/lib/concierge/types";
import { conciergeCanRunOnWhatsApp } from "@/lib/concierge/service";

export const dynamic = "force-dynamic";

const FUNNEL = ["PURPOSE", "TYPE", "AREA", "BUDGET", "HORIZON", "EXTRAS"] as const;

export async function GET(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.res;

  const sp = new URL(req.url).searchParams;
  const where: Prisma.ConciergeConversationWhereInput = {};
  const state = sp.get("state");
  if (state) where.state = state;
  if (sp.get("channel")) where.channel = sp.get("channel")!;
  const q = sp.get("q")?.trim();
  if (q) where.OR = [{ phone: { contains: q.replace(/[^\d+]/g, "") || q } }, { senderName: { contains: q, mode: "insensitive" } }];

  const [rows, counts, recent] = await Promise.all([
    prisma.conciergeConversation.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: 100,
      include: {
        lead: { select: { id: true, name: true, persona: true, leadScore: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1, select: { text: true, direction: true, author: true, createdAt: true } },
      },
    }),
    // Counts follow the channel tab, like the list does.
    prisma.conciergeConversation.groupBy({ by: ["state"], where: sp.get("channel") ? { channel: sp.get("channel")! } : {}, _count: { _all: true } }),
    prisma.conciergeConversation.findMany({
      where: { createdAt: { gte: new Date(Date.now() - 30 * 86_400_000) }, channel: sp.get("channel") ?? "WHATSAPP" },
      select: { slots: true, state: true, completedAt: true },
    }),
  ]);

  // Funnel: how many conversations got past each question.
  const funnel = [{ step: "STARTED", count: recent.length }];
  for (const step of FUNNEL) {
    funnel.push({
      step,
      count: recent.filter((c) => {
        const done = ((c.slots as Slots)?.done ?? []) as string[];
        return step === "HORIZON" ? done.includes("HORIZON") || done.includes("TIMELINE") : done.includes(step);
      }).length,
    });
  }
  funnel.push({ step: "COMPLETED", count: recent.filter((c) => c.completedAt).length });

  return NextResponse.json({
    conversations: rows.map((r) => ({
      id: r.id,
      phone: r.phone,
      channel: r.channel,
      state: r.state,
      step: r.step,
      name: (r.slots as Slots)?.name ?? r.senderName,
      answered: ((r.slots as Slots)?.done ?? []).length,
      handoffReason: r.handoffReason,
      lead: r.lead,
      lastMessage: r.messages[0] ?? null,
      updatedAt: r.updatedAt,
      reportUrl: r.reportUrl,
    })),
    counts: Object.fromEntries(counts.map((c) => [c.state, c._count._all])),
    funnel,
    whatsapp: conciergeCanRunOnWhatsApp(),
  });
}
