/**
 * Background upkeep for concierge conversations:
 *   • one friendly nudge 2–22h after someone stops mid-way (still inside
 *     WhatsApp's free 24h window — never after it)
 *   • after 72h of silence, mark abandoned and save what we learned as a lead
 *   • recover conversations stuck in PROCESSING
 *
 * Runs from the daily WhatsApp cron and, throttled, after webhook traffic
 * (Vercel's plan here only allows daily crons).
 */
import prisma from "../prisma";
import { nextStep, question } from "./engine";
import { profileFromSlots, upsertLead } from "./finalize";
import { emailInterest } from "./notify";
import { classifyProfile } from "./persona";
import { corridorOptions, deliver } from "./service";
import type { Slots, Step } from "./types";

const HOUR = 3600_000;

function stepsLeft(slots: Slots): number {
  const probe: Slots = JSON.parse(JSON.stringify(slots));
  let n = 0;
  for (let step = nextStep(probe); step && n < 10; step = nextStep(probe)) {
    probe.done = [...(probe.done ?? []), step as Step];
    n++;
  }
  return n;
}

export async function sweepConcierge(now = new Date()): Promise<{ nudged: number; abandoned: number; recovered: number }> {
  let nudged = 0;
  let abandoned = 0;
  let recovered = 0;
  const corridors = await corridorOptions();

  const due = await prisma.conciergeConversation.findMany({
    where: {
      state: "ACTIVE",
      channel: "WHATSAPP",
      nudgedAt: null,
      step: { not: null },
      lastInboundAt: { lte: new Date(now.getTime() - 2 * HOUR), gte: new Date(now.getTime() - 22 * HOUR) },
    },
    take: 50,
  });
  const suppressed = new Set(
    (await prisma.whatsAppSuppression.findMany({ where: { phone: { in: due.map((d) => d.phone) } }, select: { phone: true } })).map((x) => x.phone),
  );
  for (const conv of due) {
    if (suppressed.has(conv.phone)) continue; // they sent STOP (or the number is invalid) — never nudge
    const slots = (conv.slots as Slots) ?? {};
    const first = (slots.name ?? conv.senderName ?? "").split(" ")[0];
    const left = stepsLeft(slots);
    const claim = await prisma.conciergeConversation.updateMany({ where: { id: conv.id, nudgedAt: null }, data: { nudgedAt: now } });
    if (!claim.count) continue;
    await deliver(conv, [
      { text: `Still there${first ? `, ${first}` : ""}? 🙂 Just ${left} quick tap${left === 1 ? "" : "s"} left — then I'll send your matches.` },
      question(conv.step as Step, slots, corridors),
    ]);
    nudged++;
  }

  const stale = await prisma.conciergeConversation.findMany({
    where: { state: "ACTIVE", lastInboundAt: { lt: new Date(now.getTime() - 72 * HOUR) } },
    take: 100,
  });
  for (const conv of stale) {
    const slots = (conv.slots as Slots) ?? {};
    let leadId = conv.leadId;
    if (!leadId && (slots.done ?? []).length > 0) {
      const persona = classifyProfile(profileFromSlots(slots, conv.phone));
      leadId = await upsertLead({
        phone: conv.phone,
        name: slots.name ?? conv.senderName,
        slots,
        persona,
        source: conv.channel === "SIMULATOR" ? "concierge-simulator" : "whatsapp-concierge",
        note: `Stopped part-way through the concierge (${(slots.done ?? []).length} answers).`,
      });
      await emailInterest({
        kind: "PARTIAL",
        name: slots.name ?? conv.senderName,
        phone: conv.phone,
        slots,
        areaNames: (slots.areas ?? []).map((a) => corridors.find((c) => c.slug === a)?.shortName ?? a),
        persona: persona.persona,
        personaReason: persona.reason,
        leadId,
        conversationId: conv.id,
        simulated: conv.channel === "SIMULATOR",
      });
    }
    await prisma.conciergeConversation.update({ where: { id: conv.id }, data: { state: "ABANDONED", openKey: null, leadId } });
    abandoned++;
  }

  // A crash mid-finalise leaves PROCESSING; hand those to a person rather than leave them hanging.
  const stuck = await prisma.conciergeConversation.findMany({ where: { state: "PROCESSING", updatedAt: { lt: new Date(now.getTime() - 15 * 60_000) } }, take: 20 });
  for (const conv of stuck) {
    await prisma.conciergeConversation.update({ where: { id: conv.id }, data: { state: "HANDOFF", handoffReason: "matching failed — needs a person" } });
    recovered++;
  }

  return { nudged, abandoned, recovered };
}

let lastRun = 0;
/** Throttled: at most every 10 minutes per server instance. */
export function maybeSweepConcierge(): void {
  if (Date.now() - lastRun < 10 * 60_000) return;
  lastRun = Date.now();
  void sweepConcierge().catch((e) => console.error("[concierge] sweep failed", e));
}
