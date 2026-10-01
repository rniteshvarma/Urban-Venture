/**
 * The one way application code sends WhatsApp. Provider-neutral; in order:
 *
 *   1. normalise the number to E.164 and refuse suppressed numbers
 *   2. derive OUR idempotency key and claim it — a retry never double-sends
 *   3. validate a template send against the registry (before any API call)
 *   4. call the active provider
 *   5. log provider, category, outcome and estimated cost — before returning
 *   6. suppress the number on INVALID_NUMBER / NOT_OPTED_IN
 */
import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import prisma from "../prisma";
import { getWhatsAppProvider, isDryRun } from "./index";
import type { MessageCategory, SendResult, SendTemplateParams, WhatsAppProvider } from "./types";
import { isRetryable, shouldSuppress, type WhatsAppErrorCode } from "./errors";
import { estimateCostPaise, monthStartIST } from "./cost";
import { nationalTail, toE164 } from "./phone";
import { validateTemplateSend } from "./registry";
import { checkTierUsage } from "./health";

export type WhatsAppFeature = "weekly_report" | "pipeline_trigger" | "broadcast" | "otp" | "keyword_reply" | "concierge" | "test" | "manual";

export interface SendContext {
  feature: WhatsAppFeature;
  /** What this message is about — with the template/text and number it forms the idempotency key. */
  contextId: string;
  /** Defaults to today (IST): the same message about the same thing goes once a day. Pass "once" for never-again. */
  dateBucket?: string;
  leadId?: string | null;
  userId?: string | null;
  templateId?: string | null; // CRM WhatsAppTemplate, for its sent counter
  metadata?: Record<string, string>;
}

export interface TemplateSend extends SendContext {
  to: string;
  templateName: string;
  languageCode?: string;
  bodyParams?: string[];
  headerParams?: SendTemplateParams["headerParams"];
  buttonParams?: SendTemplateParams["buttonParams"];
  category: Exclude<MessageCategory, "SERVICE">;
  /** Human-readable rendering for the CRM timeline. */
  previewText?: string;
}

export interface TextSend extends SendContext {
  to: string;
  text: string;
}

export interface InteractiveSend extends SendContext {
  to: string;
  body: string;
  buttons?: Array<{ id: string; title: string }>;
  list?: { button: string; rows: Array<{ id: string; title: string; description?: string }> };
}

export interface SendOutcome {
  ok: boolean;
  status: SendResult["status"];
  logId?: string;
  providerMessageId?: string;
  errorCode?: WhatsAppErrorCode;
  errorMessage?: string;
  dryRun: boolean;
  provider: string;
}

export function istDateBucket(d = new Date()): string {
  return new Date(d.getTime() + 330 * 60_000).toISOString().slice(0, 10);
}

/** sha256(templateName + to + contextId + dateBucket) */
export function idempotencyKey(templateOrText: string, to: string, contextId: string, dateBucket: string): string {
  return createHash("sha256").update([templateOrText, to, contextId, dateBucket].join("␟")).digest("hex");
}

export async function isSuppressed(e164: string): Promise<boolean> {
  return !!(await prisma.whatsAppSuppression.findUnique({ where: { phone: e164 } }));
}

/** Stop messaging a number: suppression row + opt-out on every lead with it. */
export async function suppressNumber(e164: string, reason: string, source?: string): Promise<void> {
  await prisma.whatsAppSuppression.upsert({ where: { phone: e164 }, create: { phone: e164, reason, source }, update: { reason, source } });
  await prisma.lead.updateMany({ where: { phone: { contains: nationalTail(e164) } }, data: { whatsappOptOut: true } });
}

export async function unsuppressNumber(e164: string): Promise<void> {
  await prisma.whatsAppSuppression.deleteMany({ where: { phone: e164 } });
  await prisma.lead.updateMany({ where: { phone: { contains: nationalTail(e164) } }, data: { whatsappOptOut: false } });
}

/**
 * User-initiated (service) conversations this month, counted against the
 * free allowance. Approximated as one per number per IST day with an inbound
 * message — Meta's 24h windows don't align to days, so this can drift a little.
 */
export async function serviceConversationsThisMonth(): Promise<number> {
  const rows = await prisma.$queryRaw<Array<{ n: bigint }>>`
    SELECT COUNT(DISTINCT ("fromPhone", date_trunc('day', "receivedAt" + interval '330 minutes')))::bigint AS n
    FROM "WhatsAppWebhookEvent"
    WHERE "eventType" = 'MESSAGE_RECEIVED' AND "fromPhone" IS NOT NULL AND "receivedAt" >= ${monthStartIST().toISOString()}::timestamp`; // UTC wall time, like the column
  return Number(rows[0]?.n ?? 0);
}

type Plan = {
  to: string | null;
  rawTo: string;
  category: MessageCategory;
  templateName: string | null;
  languageCode: string | null;
  message: string;
  keySubject: string;
  rawRequest: Prisma.InputJsonValue;
  call: (provider: WhatsAppProvider, to: string, key: string) => Promise<SendResult>;
  validate?: () => Promise<{ ok: true } | { ok: false; code: WhatsAppErrorCode; message: string }>;
};

const STALE_PENDING_MS = 10 * 60_000;

async function dispatch(ctx: SendContext, plan: Plan): Promise<SendOutcome> {
  const provider = getWhatsAppProvider();
  const dryRun = isDryRun(provider);
  const base = { dryRun, provider: provider.name };
  const to = plan.to;
  const key = idempotencyKey(plan.keySubject, to ?? plan.rawTo, ctx.contextId, ctx.dateBucket ?? istDateBucket());

  // ── Claim the key (or find the earlier attempt) ──
  let logId: string;
  let priorAttempts = 0;
  const claimed = await prisma.whatsAppIdempotencyKey.findUnique({ where: { key } });
  if (claimed) {
    const prev = await prisma.whatsAppLog.findUnique({ where: { id: claimed.logId } });
    if (prev) {
      const stalePending = prev.status === "PENDING" && Date.now() - prev.createdAt.getTime() > STALE_PENDING_MS;
      const retryable = prev.status === "FAILED" && (!prev.normalisedError || isRetryable(prev.normalisedError as WhatsAppErrorCode));
      if (!retryable && !stalePending) {
        return {
          ...base,
          ok: prev.status !== "FAILED",
          status: "DUPLICATE",
          logId: prev.id,
          providerMessageId: prev.providerMessageId ?? undefined,
          errorCode: (prev.normalisedError as WhatsAppErrorCode | null) ?? undefined,
          errorMessage: prev.status === "FAILED" ? prev.errorMessage ?? "Previously failed (not retryable)" : undefined,
        };
      }
      logId = prev.id;
      priorAttempts = prev.attemptCount;
      await prisma.whatsAppLog.update({
        where: { id: prev.id },
        data: { status: "PENDING", provider: provider.name, dryRun, normalisedError: null, errorMessage: null, failedAt: null },
      });
    } else {
      // Key without its log (log deleted) — take it over.
      const log = await createLog(ctx, plan, key, provider.name, dryRun);
      await prisma.whatsAppIdempotencyKey.update({ where: { key }, data: { logId: log.id } });
      logId = log.id;
    }
  } else {
    try {
      logId = await prisma.$transaction(async (tx) => {
        const log = await createLog(ctx, plan, key, provider.name, dryRun, tx);
        await tx.whatsAppIdempotencyKey.create({ data: { key, logId: log.id } });
        return log.id;
      });
    } catch (err) {
      if ((err as { code?: string }).code === "P2002") {
        return { ...base, ok: true, status: "DUPLICATE", errorMessage: "A concurrent send with the same key is in flight" };
      }
      throw err;
    }
  }

  const fail = async (code: WhatsAppErrorCode, message: string, rawResponse?: unknown, attempts = 0): Promise<SendOutcome> => {
    await prisma.whatsAppLog.update({
      where: { id: logId },
      data: {
        status: "FAILED",
        normalisedError: code,
        errorMessage: message.slice(0, 1000),
        failedAt: new Date(),
        attemptCount: priorAttempts + Math.max(attempts, 1),
        rawResponse: rawResponse === undefined ? undefined : (JSON.parse(JSON.stringify(rawResponse ?? null)) as Prisma.InputJsonValue),
      },
    });
    if (to && shouldSuppress(code)) await suppressNumber(to, code, provider.name);
    return { ...base, ok: false, status: code === "RATE_LIMITED" ? "RATE_LIMITED" : "FAILED", logId, errorCode: code, errorMessage: message };
  };

  // ── Pre-flight: no API call for sends that cannot succeed ──
  if (!to) return fail("INVALID_NUMBER", `"${plan.rawTo}" is not a valid phone number`);
  if (await isSuppressed(to)) return fail("NOT_OPTED_IN", "Number is suppressed (invalid, opted out, or sent STOP)");
  if (plan.validate) {
    const check = await plan.validate();
    if (!check.ok) return fail(check.code, check.message);
  }

  // ── Send ──
  const result = await plan.call(provider, to, key);
  if (!result.ok) {
    return fail(result.errorCode ?? "UNKNOWN", result.errorMessage ?? "Send failed", result.rawResponse, result.attempts ?? 1);
  }

  const cost = dryRun ? 0 : estimateCostPaise(plan.category, plan.category === "SERVICE" ? await serviceConversationsThisMonth() : 0);
  await prisma.whatsAppLog.update({
    where: { id: logId },
    data: {
      status: "SENT",
      sentAt: new Date(),
      providerMessageId: result.providerMessageId ?? null,
      waMessageId: result.providerMessageId ?? null, // legacy mirror
      estimatedCostPaise: cost,
      attemptCount: priorAttempts + (result.attempts ?? 1),
      rawResponse: JSON.parse(JSON.stringify(result.rawResponse ?? null)) as Prisma.InputJsonValue,
    },
  });
  if (ctx.templateId) {
    await prisma.whatsAppTemplate.update({ where: { id: ctx.templateId }, data: { sentCount: { increment: 1 } } }).catch(() => {});
  }
  if (!dryRun && plan.templateName) void checkTierUsage().catch(() => {});

  return { ...base, ok: true, status: "ACCEPTED", logId, providerMessageId: result.providerMessageId };
}

function createLog(ctx: SendContext, plan: Plan, key: string, provider: string, dryRun: boolean, tx: Prisma.TransactionClient = prisma) {
  return tx.whatsAppLog.create({
    data: {
      leadId: ctx.leadId ?? null,
      userId: ctx.userId ?? null,
      templateId: ctx.templateId ?? null,
      message: plan.message,
      status: "PENDING",
      provider,
      dryRun,
      idempotencyKey: key,
      category: plan.category,
      feature: ctx.feature,
      templateName: plan.templateName,
      languageCode: plan.languageCode,
      toPhone: plan.to ?? plan.rawTo,
      rawRequest: plan.rawRequest,
      attemptCount: 0,
    },
  });
}

/** Send an approved WABA template. Works outside the 24h window. */
export function sendTemplateMessage(p: TemplateSend): Promise<SendOutcome> {
  const to = toE164(p.to);
  const languageCode = p.languageCode || "en";
  const params: Omit<SendTemplateParams, "to" | "idempotencyKey"> = {
    templateName: p.templateName,
    languageCode,
    bodyParams: p.bodyParams,
    headerParams: p.headerParams,
    buttonParams: p.buttonParams,
    category: p.category,
    metadata: p.metadata,
  };
  return dispatch(p, {
    to,
    rawTo: p.to,
    category: p.category,
    templateName: p.templateName,
    languageCode,
    message: p.previewText ?? `[${p.templateName}] ${(p.bodyParams ?? []).join(" · ")}`,
    keySubject: `template:${p.templateName}:${languageCode}`,
    rawRequest: JSON.parse(JSON.stringify({ ...params, to })) as Prisma.InputJsonValue,
    validate: () => validateTemplateSend({ ...params, to: to ?? p.to, idempotencyKey: "" }),
    call: (provider, e164, key) => provider.sendTemplate({ ...params, to: e164, idempotencyKey: key }),
  });
}

/** Send free-form text. Only delivers inside the 24h customer-service window. */
export function sendTextMessage(p: TextSend): Promise<SendOutcome> {
  const to = toE164(p.to);
  return dispatch(p, {
    to,
    rawTo: p.to,
    category: "SERVICE",
    templateName: null,
    languageCode: null,
    message: p.text,
    keySubject: `text:${createHash("sha256").update(p.text).digest("hex").slice(0, 16)}`,
    rawRequest: { to, text: p.text } as Prisma.InputJsonValue,
    call: (provider, e164, key) => provider.sendSessionMessage({ to: e164, text: p.text, idempotencyKey: key, metadata: p.metadata }),
  });
}

const KEYCAPS = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];

/** Numbered-text rendering of buttons / a list, for providers without interactive messages. */
export function renderOptionsAsText(body: string, options: Array<{ title: string; description?: string }>): string {
  if (!options.length) return body;
  const lines = options.slice(0, 10).map((o, i) => `${KEYCAPS[i]} ${o.title}${o.description ? ` — ${o.description}` : ""}`);
  return `${body}\n\n${lines.join("\n")}\n\n_Reply with a number._`;
}

/**
 * Buttons or a list inside the 24h window. Falls back to numbered text when
 * the active provider can't send interactive messages — the concierge reads
 * a numeric reply against the options it offered.
 */
export function sendInteractiveMessage(p: InteractiveSend): Promise<SendOutcome> {
  const options = p.list?.rows ?? p.buttons ?? [];
  const provider = getWhatsAppProvider();
  if (!provider.sendInteractive || !options.length) {
    return sendTextMessage({ ...p, text: renderOptionsAsText(p.body, options) });
  }
  const to = toE164(p.to);
  return dispatch(p, {
    to,
    rawTo: p.to,
    category: "SERVICE",
    templateName: null,
    languageCode: null,
    message: renderOptionsAsText(p.body, options),
    keySubject: `interactive:${createHash("sha256").update(p.body + options.map((o) => o.id).join("|")).digest("hex").slice(0, 16)}`,
    rawRequest: JSON.parse(JSON.stringify({ to, body: p.body, buttons: p.buttons, list: p.list })) as Prisma.InputJsonValue,
    call: (prov, e164, key) =>
      prov.sendInteractive!({ to: e164, body: p.body, buttons: p.buttons, list: p.list, idempotencyKey: key, metadata: p.metadata }),
  });
}
