/**
 * The concierge service — the only thing channels talk to. It loads the
 * conversation, runs the engine (asking Claude to read free text when
 * useful), persists with an optimistic lock, delivers replies over WhatsApp
 * (or returns them to the CRM simulator), and finalises when every question
 * is answered.
 */
import type { ConciergeConversation, Prisma } from "@prisma/client";
import prisma from "../prisma";
import { getWhatsAppProvider } from "../whatsapp";
import { toE164 } from "../whatsapp/phone";
import { sendInteractiveMessage, sendTextMessage } from "../whatsapp/send";
import { aiEnabled, extractSlots, writeQuickTake } from "./ai";
import { composeResults, quickTakeFacts, quickTakeFallback, RESULT_OPTIONS } from "./compose";
import { advance, initialState, needsExtraction, nextStep, question } from "./engine";
import { finalizeConversation, profileFromSlots, upsertLead } from "./finalize";
import { emailInterest, type InterestKind } from "./notify";
import { classifyProfile } from "./persona";
import { isRestart } from "./parse";
import type { CorridorOption, EngineState, Extraction, Inbound, Reply, Slots } from "./types";

export type Channel = "WHATSAPP" | "SIMULATOR";

export interface HandleResult {
  conversationId: string;
  state: string;
  replies: Reply[];
}

export function conciergeEnabled(): boolean {
  return process.env.CONCIERGE_ENABLED !== "false";
}

/**
 * The concierge replies with free-form and interactive messages inside the
 * 24h window. A provider that can only send templates (AiSensy's campaign
 * API) can't hold the conversation, so WhatsApp falls back to lead capture.
 */
export function conciergeCanRunOnWhatsApp(): { ok: boolean; reason?: string } {
  if (!conciergeEnabled()) return { ok: false, reason: "CONCIERGE_ENABLED=false" };
  const provider = getWhatsAppProvider();
  if (!provider.supportsSessionMessages) {
    return { ok: false, reason: `${provider.name} can only send approved templates, so the concierge can't reply. Use Meta Cloud API, Interakt or WATI.` };
  }
  return { ok: true };
}

// ── Corridor options (cached briefly — they change rarely) ───────────────
let corridorCache: { at: number; list: CorridorOption[] } | null = null;
export async function corridorOptions(): Promise<CorridorOption[]> {
  if (corridorCache && Date.now() - corridorCache.at < 10 * 60_000) return corridorCache.list;
  const rows = await prisma.corridorProfile.findMany({
    select: { slug: true, name: true, shortName: true, zone: true, subAreas: true, overallScore: true },
    orderBy: [{ overallScore: { sort: "desc", nulls: "last" } }, { shortName: "asc" }],
  });
  const list: CorridorOption[] = rows.map((r) => ({ slug: r.slug, name: r.name, shortName: r.shortName, zone: r.zone, subAreas: r.subAreas }));
  corridorCache = { at: Date.now(), list };
  return list;
}

const RECENT_MS = 30 * 86_400_000;

export const openKeyFor = (channel: string, phone: string) => `${channel}:${phone}`;

/**
 * The open conversation for this number, or a new one. `openKey` is unique, so
 * two first messages arriving together can't open two conversations — the
 * loser of the race picks up the winner's row.
 */
async function findOrCreate(phone: string, channel: Channel, senderName: string | null): Promise<ConciergeConversation> {
  const openKey = openKeyFor(channel, phone);
  const existing = await prisma.conciergeConversation.findUnique({ where: { openKey } });
  if (existing) {
    if (existing.updatedAt.getTime() >= Date.now() - RECENT_MS) return existing;
    // A month of silence: close it and start fresh.
    await prisma.conciergeConversation.update({ where: { id: existing.id }, data: { state: "ABANDONED", openKey: null } });
  }
  try {
    return await prisma.conciergeConversation.create({ data: { phone, channel, senderName, openKey } });
  } catch (err) {
    if ((err as { code?: string }).code === "P2002") return prisma.conciergeConversation.findUniqueOrThrow({ where: { openKey } });
    throw err;
  }
}

function toEngine(c: ConciergeConversation): EngineState {
  return {
    started: c.started,
    step: (c.step as EngineState["step"]) ?? null,
    slots: (c.slots as Slots) ?? {},
    retries: c.retries,
    pendingOptions: Array.isArray(c.pendingOptions) ? (c.pendingOptions as string[]) : [],
  };
}

const json = (v: unknown) => JSON.parse(JSON.stringify(v ?? null)) as Prisma.InputJsonValue;

/** Store and deliver replies in order. WhatsApp sends go through the provider layer. */
export async function deliver(conv: ConciergeConversation, replies: Reply[], author: "bot" | "agent" = "bot"): Promise<string | null> {
  let firstError: string | null = null;
  for (const r of replies) {
    const msg = await prisma.conciergeMessage.create({
      data: {
        conversationId: conv.id,
        direction: "OUT",
        author,
        text: r.text,
        step: r.step ?? null,
        payload: r.buttons || r.list ? json({ buttons: r.buttons, list: r.list }) : undefined,
      },
    });
    if (conv.channel === "WHATSAPP") {
      const ctx = { feature: "concierge" as const, contextId: `concierge:${conv.id}:${msg.id}`, dateBucket: "once", leadId: conv.leadId, metadata: { conversationId: conv.id } };
      const outcome =
        r.buttons || r.list
          ? await sendInteractiveMessage({ ...ctx, to: conv.phone, body: r.text, buttons: r.buttons, list: r.list })
          : await sendTextMessage({ ...ctx, to: conv.phone, text: r.text });
      if (outcome.providerMessageId) await prisma.conciergeMessage.update({ where: { id: msg.id }, data: { providerMessageId: outcome.providerMessageId } });
      if (!outcome.ok) {
        console.error(`[concierge] send failed (${outcome.errorCode}): ${outcome.errorMessage}`);
        firstError ??= outcome.errorCode === "OUTSIDE_SESSION_WINDOW"
          ? "More than 24 hours since the customer's last message — WhatsApp only allows an approved template now."
          : `${outcome.errorCode ?? "FAILED"}: ${outcome.errorMessage ?? "send failed"}`;
      }
    }
  }
  if (replies.length) await prisma.conciergeConversation.update({ where: { id: conv.id }, data: { lastOutboundAt: new Date() } });
  return firstError;
}

function areaNames(slots: Slots, corridors: CorridorOption[]): string[] {
  return (slots.areas ?? []).map((a) => corridors.find((c) => c.slug === a)?.shortName ?? a);
}

async function handOff(conv: ConciergeConversation, kind: InterestKind, reason: string, lastMessage?: string | null): Promise<void> {
  const slots = (conv.slots as Slots) ?? {};
  const corridors = await corridorOptions();
  const hasProfile = (slots.done ?? []).length > 0;
  const persona = hasProfile ? classifyProfile(profileFromSlots(slots, conv.phone)) : null;
  const leadId =
    conv.leadId ??
    (await upsertLead({
      phone: conv.phone,
      name: slots.name ?? conv.senderName,
      slots,
      persona,
      source: conv.channel === "SIMULATOR" ? "concierge-simulator" : "whatsapp-concierge",
      note: `Asked for a person (${reason}).${lastMessage ? ` Said: "${lastMessage.slice(0, 200)}"` : ""}`,
    }));
  await prisma.conciergeConversation.update({ where: { id: conv.id }, data: { state: "HANDOFF", handoffReason: reason, leadId } });
  await emailInterest({
    kind,
    name: slots.name ?? conv.senderName,
    phone: conv.phone,
    slots,
    areaNames: areaNames(slots, corridors),
    persona: persona?.persona,
    personaReason: persona?.reason,
    leadId,
    conversationId: conv.id,
    lastMessage,
    reportUrl: conv.reportUrl,
    simulated: conv.channel === "SIMULATOR",
  });
}

/** Everything answered: send the "working on it" note, match, report, results, email. */
async function complete(conv: ConciergeConversation): Promise<Reply[]> {
  const slots = (conv.slots as Slots) ?? {};
  const name = slots.name ?? conv.senderName ?? "";
  const first = name.split(" ")[0] ?? "";
  await prisma.conciergeConversation.update({ where: { id: conv.id }, data: { state: "PROCESSING", step: null } });
  const working: Reply = { text: `Thanks${first ? `, ${first}` : ""}! ⏳ Finding your best matches and preparing your report…` };
  await deliver(conv, [working]);

  const corridors = await corridorOptions();
  const result = await finalizeConversation({ conversationId: conv.id, phone: conv.phone, name: name || null, slots, simulated: conv.channel === "SIMULATOR" });
  const fallback = quickTakeFallback(first, slots, result.matches, result.closestOnly, result.gap);
  const quickTake = await writeQuickTake(quickTakeFacts(slots, result.persona.persona, result.matches, result.areas, result.gap), fallback);
  const replies = composeResults({
    name: first,
    slots,
    profile: profileFromSlots(slots, conv.phone),
    matches: result.matches,
    closestOnly: result.closestOnly,
    gap: result.gap,
    areas: result.areas,
    quickTake,
    reportUrl: result.reportUrl,
  });

  const fresh = await prisma.conciergeConversation.update({
    where: { id: conv.id },
    data: { state: "COMPLETED", completedAt: new Date(), pendingOptions: json(RESULT_OPTIONS.map((o) => o.id)) },
  });
  await deliver(fresh, replies);

  // The report link went out in the chat — record it against the report's WhatsApp delivery.
  if (result.reportId) {
    await prisma.reportDelivery.updateMany({
      where: { reportId: result.reportId, channel: "WHATSAPP", status: "PENDING" },
      data: conv.channel === "SIMULATOR" ? { status: "SUPPRESSED", errorMessage: "Sent in the CRM simulator" } : { status: "SENT", sentAt: new Date() },
    });
  }

  await emailInterest({
    kind: "COMPLETED",
    name: name || null,
    phone: conv.phone,
    slots,
    areaNames: areaNames(slots, corridors),
    persona: result.persona.persona,
    personaReason: result.persona.reason,
    matches: result.matches,
    reportUrl: result.reportUrl,
    leadId: result.leadId,
    conversationId: conv.id,
    simulated: conv.channel === "SIMULATOR",
  });
  return [working, ...replies];
}

/** After the results: site visit, advisor, weekly opt-in, or a follow-up question. */
async function afterCompletion(conv: ConciergeConversation, input: Inbound): Promise<Reply[]> {
  const pending = Array.isArray(conv.pendingOptions) ? (conv.pendingOptions as string[]) : [];
  const text = input.text?.trim() ?? "";
  const optionId = input.optionId ?? (/^\d$/.test(text) ? pending[Number(text) - 1] : null);
  let replies: Reply[];
  if (optionId === "c:WEEKLY") {
    await prisma.conciergeConversation.update({ where: { id: conv.id }, data: { weeklyOptIn: true } });
    if (conv.userId) await prisma.reportPreference.updateMany({ where: { userId: conv.userId }, data: { isActive: true, frequency: "WEEKLY", pausedUntil: null, unsubscribedAt: null } });
    replies = [{ text: "Done ✅ You'll get a fresh report here every week. Reply *PAUSE* to take a break or *STOP* to unsubscribe." }];
  } else if (optionId === "c:VISIT") {
    replies = [{ text: "Great choice 🙌 An advisor will message you here shortly to fix a convenient time for the site visit." }];
    await deliver(conv, replies);
    await handOff(conv, "SITE_VISIT", "site visit");
    return replies;
  } else if (optionId === "c:ADVISOR" || optionId === "handoff") {
    replies = [{ text: "Sure — an advisor will message you here shortly. 🙏" }];
    await deliver(conv, replies);
    await handOff(conv, "ADVISOR", "asked for advisor");
    return replies;
  } else {
    replies = [{ text: "Thanks! I've passed your message to our advisor, who'll reply here shortly. Type *RESTART* anytime for a fresh search." }];
    await deliver(conv, replies);
    await handOff(conv, "FOLLOW_UP", "follow-up after results", text || null);
    return replies;
  }
  await deliver(conv, replies);
  return replies;
}

/**
 * Handle one inbound message. Safe to call concurrently for the same number:
 * state writes are guarded by an optimistic version check and retried.
 */
export async function handleConciergeInbound(input: {
  phone: string;
  text?: string | null;
  optionId?: string | null;
  senderName?: string | null;
  channel: Channel;
  messageType?: string;
}): Promise<HandleResult> {
  const phone = toE164(input.phone) ?? input.phone;
  let conv = await findOrCreate(phone, input.channel, input.senderName ?? null);
  const text = input.text?.trim() || null;

  await prisma.conciergeMessage.create({
    data: {
      conversationId: conv.id,
      direction: "IN",
      author: "customer",
      text: text ?? (input.optionId ? `[tapped ${input.optionId}]` : `[${input.messageType ?? "message"}]`),
      payload: input.optionId ? json({ optionId: input.optionId }) : undefined,
      step: conv.step,
    },
  });
  conv = await prisma.conciergeConversation.update({
    where: { id: conv.id },
    data: { lastInboundAt: new Date(), nudgedAt: null, senderName: conv.senderName ?? input.senderName ?? null },
  });

  const out = (replies: Reply[]): HandleResult => ({ conversationId: conv.id, state: conv.state, replies });

  // A restart always starts a fresh search, whatever the state.
  if (text && isRestart(text) && conv.state !== "ACTIVE") {
    conv = await prisma.conciergeConversation.update({
      where: { id: conv.id },
      data: { state: "ACTIVE", step: null, slots: {}, retries: 0, pendingOptions: [], started: false, completedAt: null, handoffReason: null, reportUrl: null, reportId: null, weeklyOptIn: null, version: { increment: 1 } },
    });
  }

  if (conv.state === "HANDOFF") return out([]); // a person owns this chat now
  if (conv.state === "PROCESSING") {
    const r = [{ text: "One moment — still pulling your matches together ⏳" }];
    await deliver(conv, r);
    return out(r);
  }
  if (conv.state === "COMPLETED") {
    const r = await afterCompletion(conv, { text, optionId: input.optionId });
    conv = (await prisma.conciergeConversation.findUnique({ where: { id: conv.id } }))!;
    return out(r);
  }

  if (!text && !input.optionId && conv.started) {
    const step = conv.step as EngineState["step"];
    const r: Reply[] = [{ text: "I can only read text for now 🙂 Please type your answer or tap an option." }];
    if (step) r.push(question(step, (conv.slots as Slots) ?? {}, await corridorOptions()));
    await deliver(conv, r);
    return out(r);
  }

  const corridors = await corridorOptions();
  let extraction: Extraction | null = null;
  let extracted = false;

  for (let attempt = 0; attempt < 3; attempt++) {
    const state = toEngine(conv);
    if (!extracted && aiEnabled() && needsExtraction(state, { text, optionId: input.optionId }, corridors)) {
      extraction = await extractSlots(text!, { step: state.step, slots: state.slots, corridors });
      extracted = true;
    }
    const res = advance(state, { text, optionId: input.optionId }, corridors, { senderName: conv.senderName, extraction });

    if (res.restart) {
      const fresh = advance(initialState(), { text: null }, corridors, { senderName: conv.senderName });
      const ok = await prisma.conciergeConversation.updateMany({
        where: { id: conv.id, version: conv.version },
        data: { step: fresh.state.step, slots: json(fresh.state.slots), retries: 0, pendingOptions: json(fresh.state.pendingOptions), started: true, version: { increment: 1 } },
      });
      if (!ok.count) {
        conv = (await prisma.conciergeConversation.findUnique({ where: { id: conv.id } }))!;
        continue;
      }
      await deliver(conv, fresh.replies);
      return out(fresh.replies);
    }

    const ok = await prisma.conciergeConversation.updateMany({
      where: { id: conv.id, version: conv.version },
      data: {
        step: res.state.step,
        slots: json(res.state.slots),
        retries: res.state.retries,
        pendingOptions: json(res.state.pendingOptions),
        started: res.state.started,
        version: { increment: 1 },
      },
    });
    if (!ok.count) {
      conv = (await prisma.conciergeConversation.findUnique({ where: { id: conv.id } }))!;
      continue; // someone else moved the conversation on — replay against the latest state
    }
    conv = (await prisma.conciergeConversation.findUnique({ where: { id: conv.id } }))!;

    if (res.handoff) {
      await deliver(conv, res.replies);
      await handOff(conv, "ADVISOR", "asked for a person", text);
      conv = (await prisma.conciergeConversation.findUnique({ where: { id: conv.id } }))!;
      return out(res.replies);
    }
    await deliver(conv, res.replies);
    if (res.complete) {
      const results = await complete(conv);
      conv = (await prisma.conciergeConversation.findUnique({ where: { id: conv.id } }))!;
      return out([...res.replies, ...results]);
    }
    return out(res.replies);
  }
  throw new Error(`[concierge] could not apply message to ${conv.id} after 3 attempts`);
}

/** CRM actions on a conversation. */
export async function takeOver(conversationId: string): Promise<void> {
  await prisma.conciergeConversation.update({ where: { id: conversationId }, data: { state: "HANDOFF", handoffReason: "taken over in CRM" } });
}

export async function handBack(conversationId: string): Promise<void> {
  const conv = await prisma.conciergeConversation.findUniqueOrThrow({ where: { id: conversationId } });
  const slots = (conv.slots as Slots) ?? {};
  const pending = nextStep(slots);
  await prisma.conciergeConversation.update({
    where: { id: conversationId },
    data: { state: conv.completedAt ? "COMPLETED" : "ACTIVE", handoffReason: null, step: conv.completedAt ? null : pending, retries: 0 },
  });
}

export async function agentReply(conversationId: string, text: string): Promise<{ ok: boolean; error?: string }> {
  const conv = await prisma.conciergeConversation.findUniqueOrThrow({ where: { id: conversationId } });
  if (conv.state !== "HANDOFF") await takeOver(conversationId);
  const error = await deliver(conv, [{ text }], "agent");
  return error ? { ok: false, error } : { ok: true };
}
