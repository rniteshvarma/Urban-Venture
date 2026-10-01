/**
 * Handlers for normalised inbound events. Nothing here ever sees a raw
 * provider payload — only NormalisedInboundEvent.
 *
 *   MESSAGE_RECEIVED → inbound-lead handling (append or create) + STOP/PAUSE/START
 *   STATUS_UPDATE    → WhatsAppLog, ReportDelivery, BroadcastRecipient
 *   TEMPLATE_STATUS  → template registry, admin alert on REJECTED/PAUSED
 *   ACCOUNT_UPDATE   → admin alert on quality drop
 */
import type { DeliveryStatus as ReportDeliveryStatus, WAStatus } from "@prisma/client";
import prisma from "../prisma";
import { processInboundLead } from "../inbound/handler";
import { calculateLeadScore } from "../lead-scorer";
import type { DeliveryStatus, NormalisedInboundEvent } from "./types";
import { shouldSuppress } from "./errors";
import { nationalTail } from "./phone";
import { sendTextMessage, suppressNumber, unsuppressNumber } from "./send";
import { onTemplateStatus, syncTemplates } from "./registry";
import { onQualityChange } from "./health";
import { conciergeCanRunOnWhatsApp, handleConciergeInbound } from "../concierge/service";
import { maybeSweepConcierge } from "../concierge/sweep";

export type EventOutcome = { handled: string };

export type Keyword = "STOP" | "PAUSE" | "START" | null;

/** Opt-out / pause / resume keywords. Whole-message match only, so "don't stop" is not a STOP. */
export function detectKeyword(text: string | undefined): Keyword {
  const t = (text ?? "").trim().toUpperCase().replace(/[.!]+$/, "");
  if (/^(STOP|STOP ALL|UNSUBSCRIBE|OPT ?OUT|CANCEL)$/.test(t)) return "STOP";
  if (/^(PAUSE|PAUSE REPORTS?)$/.test(t)) return "PAUSE";
  if (/^(START|RESUME|SUBSCRIBE|UNSTOP)$/.test(t)) return "START";
  return null;
}

const PAUSE_DAYS = 28;

async function handleKeyword(keyword: Exclude<Keyword, null>, from: string, eventId: string): Promise<string> {
  const users = await prisma.user.findMany({ where: { phone: { contains: nationalTail(from) } }, select: { id: true } });
  const userIds = users.map((u) => u.id);
  const reply = (text: string) =>
    sendTextMessage({ to: from, text, feature: "keyword_reply", contextId: `keyword:${keyword}:${eventId}`, dateBucket: "once" }).catch(() => null);

  if (keyword === "STOP") {
    // Confirm first: once suppressed, nothing more can go to this number.
    await reply("You're unsubscribed from Property Tiger WhatsApp messages. Reply START any time to opt back in.");
    await suppressNumber(from, "STOP_KEYWORD", "keyword");
    // Close any concierge chat so it is never nudged again.
    await prisma.conciergeConversation.updateMany({ where: { phone: from, state: { in: ["ACTIVE", "PROCESSING"] } }, data: { state: "ABANDONED", openKey: null } });
    if (userIds.length) await prisma.reportPreference.updateMany({ where: { userId: { in: userIds } }, data: { channelWhatsApp: false } });
    return "keyword:stop";
  }
  if (keyword === "PAUSE") {
    const until = new Date(Date.now() + PAUSE_DAYS * 86_400_000);
    if (userIds.length) await prisma.reportPreference.updateMany({ where: { userId: { in: userIds } }, data: { pausedUntil: until } });
    await reply(`Your weekly report is paused for ${PAUSE_DAYS / 7} weeks. Reply START to resume sooner.`);
    return "keyword:pause";
  }
  await unsuppressNumber(from);
  if (userIds.length) {
    await prisma.reportPreference.updateMany({ where: { userId: { in: userIds } }, data: { channelWhatsApp: true, pausedUntil: null } });
  }
  await reply("You're subscribed to Property Tiger WhatsApp updates again. Reply STOP to opt out.");
  return "keyword:start";
}

/** The inbound-lead flow that used to live in the legacy inbound route. */
async function handleInboundLead(ev: NormalisedInboundEvent): Promise<string> {
  const from = ev.from!;
  if (!["text", "interactive", "button"].includes(ev.messageType ?? "text")) return "ignored:non-text";

  const existingLead = await prisma.lead.findFirst({
    where: { phone: { contains: nationalTail(from) } },
    orderBy: { createdAt: "desc" },
  });

  if (existingLead) {
    const timeStr = ev.timestamp.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    await prisma.lead.update({
      where: { id: existingLead.id },
      data: { notes: `${existingLead.notes || ""}\n[WhatsApp ${timeStr}] ${ev.text || "Incoming message"}`, updatedAt: new Date() },
    });
    calculateLeadScore(existingLead.id).catch(console.error);
    return `appended:${existingLead.id}`;
  }

  let source = await prisma.inboundSource.findFirst({ where: { type: "WHATSAPP", isActive: true } });
  if (!source) {
    source = await prisma.inboundSource.create({
      data: { name: "WhatsApp Business", type: "WHATSAPP", webhookToken: "whatsapp-token-uv-2026", defaultStatus: "NEW", dedupeWindow: 24, isActive: true },
    });
  }

  const result = await processInboundLead({
    sourceId: source.id,
    rawPayload: { from, text: ev.text, senderName: ev.senderName, providerMessageId: ev.providerMessageId },
    parsedData: {
      name: ev.senderName || "WhatsApp Contact",
      phone: from.replace(/\D/g, ""),
      message: ev.text || "WhatsApp Enquiry",
      sourceMessageId: ev.providerMessageId || `wa-${ev.timestamp.getTime()}`,
    },
  });
  return `lead:${result.status}${result.leadId ? `:${result.leadId}` : ""}`;
}

const LOG_RANK: Record<WAStatus, number> = { PENDING: 0, SENT: 1, DELIVERED: 2, READ: 3, FAILED: 1.5 };

/** Receipts arrive out of order; never move a message backwards (READ beats a late DELIVERED). */
export function nextLogStatus(current: WAStatus, incoming: DeliveryStatus): WAStatus | null {
  if (incoming === "FAILED") return current === "DELIVERED" || current === "READ" ? null : "FAILED";
  const target = incoming as WAStatus;
  if (current === "FAILED") return target === "SENT" ? null : target; // a later delivery proves the failure wrong
  return LOG_RANK[target] > LOG_RANK[current] ? target : null;
}

const REPORT_MAP: Record<DeliveryStatus, ReportDeliveryStatus> = { SENT: "SENT", DELIVERED: "DELIVERED", READ: "OPENED", FAILED: "FAILED" };
const REPORT_RANK: Partial<Record<ReportDeliveryStatus, number>> = { PENDING: 0, SENT: 1, DELIVERED: 2, OPENED: 3, CLICKED: 4 };

async function handleStatus(ev: NormalisedInboundEvent): Promise<string> {
  if (!ev.providerMessageId || !ev.deliveryStatus) return "ignored:incomplete-status";
  const at = ev.timestamp;
  const touched: string[] = [];

  const log = await prisma.whatsAppLog.findFirst({
    where: { OR: [{ providerMessageId: ev.providerMessageId }, { waMessageId: ev.providerMessageId }] },
  });
  if (log) {
    const next = nextLogStatus(log.status, ev.deliveryStatus);
    if (next) {
      await prisma.whatsAppLog.update({
        where: { id: log.id },
        data: {
          status: next,
          ...(next === "SENT" && !log.sentAt ? { sentAt: at } : {}),
          ...(next === "DELIVERED" ? { deliveredAt: at } : {}),
          ...(next === "READ" ? { readAt: at, deliveredAt: log.deliveredAt ?? at } : {}),
          ...(next === "FAILED"
            ? { failedAt: at, normalisedError: ev.failureCode ?? "UNKNOWN", errorMessage: ev.failureReason?.slice(0, 1000) ?? "Delivery failed" }
            : {}),
        },
      });
      touched.push("log");
    }
    const phone = log.toPhone ?? ev.from;
    if (next === "FAILED" && phone && shouldSuppress(ev.failureCode)) await suppressNumber(phone, ev.failureCode!, log.provider);
  }

  const report = await prisma.reportDelivery.findFirst({ where: { channel: "WHATSAPP", providerId: ev.providerMessageId } });
  if (report) {
    const target = REPORT_MAP[ev.deliveryStatus];
    const forward = target === "FAILED" ? !["DELIVERED", "OPENED", "CLICKED"].includes(report.status) : (REPORT_RANK[target] ?? 0) > (REPORT_RANK[report.status] ?? -1);
    if (forward) {
      await prisma.reportDelivery.update({
        where: { id: report.id },
        data: {
          status: target,
          ...(target === "SENT" ? { sentAt: report.sentAt ?? at } : {}),
          ...(target === "DELIVERED" ? { deliveredAt: at } : {}),
          ...(target === "OPENED" ? { openedAt: at, deliveredAt: report.deliveredAt ?? at } : {}),
          ...(target === "FAILED" ? { errorMessage: ev.failureReason ?? "Delivery failed" } : {}),
        },
      });
      touched.push("report");
    }
  }

  const recipient = await prisma.broadcastRecipient.findFirst({ where: { whatsappMessageId: ev.providerMessageId } });
  if (recipient) {
    const next = nextLogStatus(recipient.whatsappStatus ?? "PENDING", ev.deliveryStatus);
    if (next) {
      await prisma.broadcastRecipient.update({ where: { id: recipient.id }, data: { whatsappStatus: next } });
      touched.push("broadcast");
    }
  }

  return touched.length ? `status:${ev.deliveryStatus}:${touched.join("+")}` : "status:no-match";
}

export async function handleEvent(ev: NormalisedInboundEvent, eventId: string): Promise<EventOutcome> {
  switch (ev.eventType) {
    case "MESSAGE_RECEIVED": {
      if (!ev.from) return { handled: "ignored:no-sender" };
      const keyword = detectKeyword(ev.text ?? ev.buttonPayload);
      if (keyword) return { handled: await handleKeyword(keyword, ev.from, eventId) };
      const concierge = conciergeCanRunOnWhatsApp();
      if (!concierge.ok && concierge.reason?.includes("templates")) console.warn(`[concierge] off for WhatsApp: ${concierge.reason}`);
      if (concierge.ok) {
        // The concierge qualifies the buyer and creates/updates the lead itself.
        const known = ["text", "interactive", "button"].includes(ev.messageType ?? "text");
        const r = await handleConciergeInbound({
          phone: ev.from,
          text: known ? ev.text ?? null : null,
          optionId: ev.messageType === "interactive" || ev.messageType === "button" ? ev.buttonPayload ?? null : null,
          senderName: ev.senderName ?? null,
          channel: "WHATSAPP",
          messageType: ev.messageType,
        });
        maybeSweepConcierge();
        return { handled: `concierge:${r.state}:${r.conversationId}` };
      }
      return { handled: await handleInboundLead(ev) };
    }
    case "STATUS_UPDATE":
      return { handled: await handleStatus(ev) };
    case "TEMPLATE_STATUS": {
      if (!ev.templateName || !ev.templateStatus) return { handled: "ignored:incomplete-template" };
      await onTemplateStatus(ev.templateName, ev.templateLanguage, ev.templateStatus, ev.rejectionReason);
      const known = await prisma.whatsAppTemplateRegistry.count({ where: { name: ev.templateName } });
      if (!known && ev.templateStatus === "APPROVED") await syncTemplates().catch(() => null);
      return { handled: `template:${ev.templateName}:${ev.templateStatus}` };
    }
    case "ACCOUNT_UPDATE":
      await onQualityChange(ev.qualityRating, ev.messagingLimit);
      return { handled: `account:${ev.qualityRating ?? "?"}` };
    default:
      return { handled: "ignored:unknown" };
  }
}
