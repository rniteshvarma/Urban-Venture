/**
 * Meta Cloud API, direct — the default provider (no BSP platform fee).
 *
 *   Send:      POST {base}/{PHONE_NUMBER_ID}/messages
 *   Templates: GET  {base}/{WABA_ID}/message_templates
 *   Auth:      Bearer {SYSTEM_USER_TOKEN} — a System User token, which does not expire
 *   Webhooks:  X-Hub-Signature-256 = HMAC-SHA256(raw body, APP_SECRET)
 */
import type {
  AccountInfo,
  DeliveryStatus,
  NormalisedInboundEvent,
  SendInteractiveParams,
  SendResult,
  SendSessionParams,
  SendTemplateParams,
  TemplateDefinition,
  WhatsAppProvider,
} from "../types";
import type { WhatsAppErrorCode } from "../errors";
import { codeFromMessage } from "../errors";
import {
  digitsOnly,
  failureFrom,
  hmacSha256Hex,
  http,
  normaliseTemplateCategory,
  normaliseTemplateStatus,
  parseMetaComponents,
  parseTimestamp,
  safeEqual,
  withBackoff,
  type HttpResult,
} from "./_shared";

const env = () => ({
  wabaId: process.env.META_WABA_ID ?? "",
  phoneNumberId: process.env.META_PHONE_NUMBER_ID ?? "",
  token: process.env.META_SYSTEM_USER_TOKEN ?? "",
  appSecret: process.env.META_APP_SECRET ?? "",
  verifyToken: process.env.META_WEBHOOK_VERIFY_TOKEN ?? "",
  version: process.env.META_GRAPH_VERSION || "v21.0",
});

/** Meta Graph error code → our normalised code. */
export function mapMetaError(code: number | undefined, httpStatus: number, message?: string): WhatsAppErrorCode {
  switch (code) {
    case 131026: // message undeliverable (not on WhatsApp, old app, or hasn't accepted terms)
      return "INVALID_NUMBER";
    case 131030: // recipient not in the allowed list (test number)
    case 131050: // user stopped marketing messages
      return "NOT_OPTED_IN";
    case 131047: // re-engagement message: more than 24h since the user last replied
      return "OUTSIDE_SESSION_WINDOW";
    case 131056: // pair rate limit
    case 130429: // throughput
    case 4:
    case 80007:
    case 613:
      return "RATE_LIMITED";
    case 131048: // spam rate limit
    case 131049: // Meta chose not to deliver (per-user marketing limit)
      return "QUOTA_EXCEEDED";
    case 132000: // param count mismatch
    case 132012: // param format mismatch
    case 131008: // required parameter missing
    case 131009: // parameter value invalid
      return "TEMPLATE_PARAM_MISMATCH";
    case 132001:
      return "TEMPLATE_NOT_FOUND";
    case 132007: // policy violation
    case 132015: // template paused
    case 132016: // template disabled
      return "TEMPLATE_NOT_APPROVED";
    case 131052:
    case 131053:
      return "MEDIA_ERROR";
    case 131042: // business eligibility / payment issue
      return "INSUFFICIENT_BALANCE";
    case 0:
    case 3:
    case 10:
    case 190:
    case 368:
    case 131031:
    case 133010:
      return "AUTH_FAILED";
    case 1:
    case 2:
    case 131016:
      return "PROVIDER_UNAVAILABLE";
  }
  if (code && code >= 200 && code < 300) return "AUTH_FAILED"; // permission errors
  if (httpStatus === 429) return "RATE_LIMITED";
  if (httpStatus === 401 || httpStatus === 403) return "AUTH_FAILED";
  if (httpStatus >= 500) return "PROVIDER_UNAVAILABLE";
  return codeFromMessage(message) ?? "UNKNOWN";
}

type MetaError = { message?: string; code?: number; error_subcode?: number; error_data?: { details?: string } };

function sendResultFrom(res: HttpResult): SendResult {
  if (res.networkError) return failureFrom(res);
  const body = res.json as { messages?: Array<{ id?: string }>; error?: MetaError } | null;
  const id = body?.messages?.[0]?.id;
  if (res.ok && id) return { ok: true, status: "ACCEPTED", providerMessageId: id, rawResponse: body };
  const err = body?.error;
  const message = err?.error_data?.details || err?.message || res.text.slice(0, 500) || `HTTP ${res.status}`;
  const errorCode = mapMetaError(err?.code, res.status, message);
  return {
    ok: false,
    status: errorCode === "RATE_LIMITED" ? "RATE_LIMITED" : "FAILED",
    errorCode,
    errorMessage: err?.code ? `${message} (Meta ${err.code})` : message,
    rawResponse: body ?? res.text,
  };
}

/** Our SendTemplateParams → Meta's template `components` array. */
export function buildMetaComponents(p: SendTemplateParams): unknown[] {
  const components: unknown[] = [];
  if (p.headerParams) {
    const { type, value } = p.headerParams;
    components.push({
      type: "header",
      parameters: [type === "text" ? { type: "text", text: value } : { type, [type]: { link: value } }],
    });
  }
  if (p.bodyParams?.length) {
    components.push({ type: "body", parameters: p.bodyParams.map((text) => ({ type: "text", text })) });
  }
  for (const b of p.buttonParams ?? []) {
    components.push({
      type: "button",
      sub_type: b.subType,
      index: String(b.index),
      parameters: [b.subType === "url" ? { type: "text", text: b.value } : { type: "payload", payload: b.value }],
    });
  }
  return components;
}

const STATUS_MAP: Record<string, DeliveryStatus> = { sent: "SENT", delivered: "DELIVERED", read: "READ", failed: "FAILED" };

const plus = (waId: string | undefined) => (waId ? `+${digitsOnly(waId)}` : undefined);
const tsDate = parseTimestamp;

type MetaMessage = {
  from?: string;
  id?: string;
  timestamp?: string;
  type?: string;
  text?: { body?: string };
  button?: { payload?: string; text?: string };
  interactive?: { type?: string; button_reply?: { id?: string; title?: string }; list_reply?: { id?: string; title?: string } };
  image?: { id?: string; caption?: string };
  document?: { id?: string; caption?: string };
  audio?: { id?: string };
  video?: { id?: string; caption?: string };
  location?: { latitude?: number; longitude?: number; name?: string };
};

type MetaStatus = {
  id?: string;
  status?: string;
  timestamp?: string;
  recipient_id?: string;
  errors?: Array<{ code?: number; title?: string; message?: string; error_data?: { details?: string } }>;
};

/**
 * Meta's webhook shape → normalised events. Exported so BSPs that forward
 * Meta-shaped payloads can reuse it. One request can carry many events.
 */
export function parseMetaPayload(payload: unknown): NormalisedInboundEvent[] {
  const events: NormalisedInboundEvent[] = [];
  const entries = (payload as { entry?: unknown[] } | null)?.entry;
  if (!Array.isArray(entries)) return events;

  for (const entry of entries as Array<{ changes?: Array<{ field?: string; value?: Record<string, unknown> }> }>) {
    for (const change of entry.changes ?? []) {
      const value = change.value ?? {};
      const field = change.field;

      if (field === "messages") {
        const metadata = value.metadata as { display_phone_number?: string } | undefined;
        const contacts = (value.contacts as Array<{ wa_id?: string; profile?: { name?: string } }>) ?? [];
        for (const m of (value.messages as MetaMessage[]) ?? []) {
          const contact = contacts.find((c) => c.wa_id === m.from) ?? contacts[0];
          const base: NormalisedInboundEvent = {
            eventType: "MESSAGE_RECEIVED",
            providerMessageId: m.id,
            from: plus(m.from),
            toWaba: plus(metadata?.display_phone_number),
            senderName: contact?.profile?.name,
            timestamp: tsDate(m.timestamp),
            rawPayload: m,
          };
          switch (m.type) {
            case "text":
              events.push({ ...base, messageType: "text", text: m.text?.body });
              break;
            case "button":
              events.push({ ...base, messageType: "button", text: m.button?.text, buttonPayload: m.button?.payload });
              break;
            case "interactive": {
              const reply = m.interactive?.button_reply ?? m.interactive?.list_reply;
              events.push({ ...base, messageType: "interactive", text: reply?.title, buttonPayload: reply?.id });
              break;
            }
            case "image":
            case "document":
            case "video":
              events.push({ ...base, messageType: m.type, mediaId: m[m.type]?.id, text: m[m.type]?.caption });
              break;
            case "audio":
              events.push({ ...base, messageType: "audio", mediaId: m.audio?.id });
              break;
            case "location":
              events.push({ ...base, messageType: "location", text: m.location?.name ?? `${m.location?.latitude},${m.location?.longitude}` });
              break;
            default:
              events.push({ ...base, messageType: "unsupported" });
          }
        }
        for (const s of (value.statuses as MetaStatus[]) ?? []) {
          const err = s.errors?.[0];
          const reason = err ? err.error_data?.details || err.message || err.title : undefined;
          events.push({
            eventType: "STATUS_UPDATE",
            providerMessageId: s.id,
            from: plus(s.recipient_id),
            deliveryStatus: STATUS_MAP[s.status ?? ""] ?? undefined,
            failureReason: err ? `${reason ?? "Failed"}${err.code ? ` (Meta ${err.code})` : ""}` : undefined,
            failureCode: err ? mapMetaError(err.code, 200, reason) : undefined,
            timestamp: tsDate(s.timestamp),
            rawPayload: s,
          });
        }
        continue;
      }

      if (field === "message_template_status_update") {
        events.push({
          eventType: "TEMPLATE_STATUS",
          templateName: value.message_template_name as string | undefined,
          templateLanguage: value.message_template_language as string | undefined,
          templateStatus: normaliseTemplateStatus(value.event),
          rejectionReason: value.reason && value.reason !== "NONE" ? String(value.reason) : undefined,
          timestamp: new Date(),
          rawPayload: value,
        });
        continue;
      }

      if (field === "phone_number_quality_update") {
        const ev = String(value.event ?? "").toUpperCase();
        events.push({
          eventType: "ACCOUNT_UPDATE",
          qualityRating: ev === "FLAGGED" ? "RED" : ev === "UNFLAGGED" ? "GREEN" : "UNKNOWN",
          messagingLimit: value.current_limit ? String(value.current_limit) : undefined,
          timestamp: new Date(),
          rawPayload: value,
        });
        continue;
      }

      events.push({ eventType: "UNKNOWN", timestamp: new Date(), rawPayload: change });
    }
  }
  return events;
}

const TIER_LIMITS: Record<string, number> = { TIER_50: 50, TIER_250: 250, TIER_1K: 1000, TIER_10K: 10000, TIER_100K: 100000 };

type MetaTemplate = { name: string; language: string; category?: string; status?: string; components?: unknown; rejected_reason?: string };

function toDefinition(t: MetaTemplate): TemplateDefinition {
  return {
    name: t.name,
    language: t.language,
    category: normaliseTemplateCategory(t.category),
    status: normaliseTemplateStatus(t.status),
    components: t.components ?? [],
    rejectionReason: t.rejected_reason && t.rejected_reason !== "NONE" ? t.rejected_reason : undefined,
    ...parseMetaComponents(t.components),
  };
}

export class MetaCloudProvider implements WhatsAppProvider {
  readonly name = "meta-cloud" as const;
  readonly supportsTemplateManagement = true;
  readonly supportsMediaUpload = true;
  readonly supportsSessionMessages = true;

  configStatus() {
    return [
      { env: "META_PHONE_NUMBER_ID", set: !!process.env.META_PHONE_NUMBER_ID, required: true },
      { env: "META_SYSTEM_USER_TOKEN", set: !!process.env.META_SYSTEM_USER_TOKEN, required: true },
      { env: "META_WABA_ID", set: !!process.env.META_WABA_ID, required: true },
      { env: "META_APP_SECRET", set: !!process.env.META_APP_SECRET, required: true },
      { env: "META_WEBHOOK_VERIFY_TOKEN", set: !!process.env.META_WEBHOOK_VERIFY_TOKEN, required: true },
      { env: "META_GRAPH_VERSION", set: !!process.env.META_GRAPH_VERSION, required: false },
    ];
  }

  isConfigured(): boolean {
    const e = env();
    return !!(e.phoneNumberId && e.token);
  }

  private base(): string {
    return `https://graph.facebook.com/${env().version}`;
  }

  private headers(json = true): Record<string, string> {
    return { Authorization: `Bearer ${env().token}`, ...(json ? { "Content-Type": "application/json" } : {}) };
  }

  private post(body: Record<string, unknown>): Promise<SendResult> {
    return withBackoff(async () => {
      const res = await http(`${this.base()}/${env().phoneNumberId}/messages`, {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify(body),
      });
      return sendResultFrom(res);
    });
  }

  sendTemplate(p: SendTemplateParams): Promise<SendResult> {
    const components = buildMetaComponents(p);
    return this.post({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: digitsOnly(p.to), // Meta wants no leading "+"
      type: "template",
      template: { name: p.templateName, language: { code: p.languageCode }, ...(components.length ? { components } : {}) },
      biz_opaque_callback_data: p.idempotencyKey.slice(0, 512), // echoed back on status webhooks
    });
  }

  sendSessionMessage(p: SendSessionParams): Promise<SendResult> {
    return this.post({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: digitsOnly(p.to),
      type: "text",
      text: { preview_url: false, body: p.text },
      biz_opaque_callback_data: p.idempotencyKey.slice(0, 512),
    });
  }

  sendInteractive(p: SendInteractiveParams): Promise<SendResult> {
    const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
    const interactive = p.list
      ? {
          type: "list",
          body: { text: clip(p.body, 1024) },
          action: {
            button: clip(p.list.button, 20),
            sections: [
              {
                title: clip(p.list.button, 24),
                rows: p.list.rows.slice(0, 10).map((r) => ({
                  id: r.id,
                  title: clip(r.title, 24),
                  ...(r.description ? { description: clip(r.description, 72) } : {}),
                })),
              },
            ],
          },
        }
      : {
          type: "button",
          body: { text: clip(p.body, 1024) },
          action: { buttons: (p.buttons ?? []).slice(0, 3).map((b) => ({ type: "reply", reply: { id: b.id, title: clip(b.title, 20) } })) },
        };
    return this.post({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: digitsOnly(p.to),
      type: "interactive",
      interactive,
      biz_opaque_callback_data: p.idempotencyKey.slice(0, 512),
    });
  }

  async verifyWebhook(req: Request, rawBody: string): Promise<boolean> {
    const secret = env().appSecret;
    if (!secret) {
      console.error("[whatsapp:meta-cloud] META_APP_SECRET is not set — rejecting webhook.");
      return false;
    }
    const header = req.headers.get("x-hub-signature-256") ?? "";
    const provided = header.replace(/^sha256=/i, "");
    if (!provided) return false;
    // Signed over the RAW body — re-serialising parsed JSON changes the bytes.
    return safeEqual(provided, hmacSha256Hex(secret, rawBody));
  }

  parseWebhook(payload: unknown): NormalisedInboundEvent[] {
    return parseMetaPayload(payload);
  }

  handleWebhookChallenge(req: Request): Response | null {
    const url = new URL(req.url);
    if (url.searchParams.get("hub.mode") !== "subscribe") return null;
    const expected = env().verifyToken;
    const given = url.searchParams.get("hub.verify_token") ?? "";
    if (!expected || !safeEqual(given, expected)) return new Response("Forbidden", { status: 403 });
    return new Response(url.searchParams.get("hub.challenge") ?? "", { status: 200, headers: { "Content-Type": "text/plain" } });
  }

  async listTemplates(): Promise<TemplateDefinition[]> {
    const { wabaId } = env();
    if (!wabaId) throw new Error("META_WABA_ID is not set");
    const out: TemplateDefinition[] = [];
    let url: string | null =
      `${this.base()}/${wabaId}/message_templates?limit=100&fields=name,language,category,status,components,rejected_reason`;
    for (let page = 0; url && page < 20; page++) {
      const res = await http(url, { headers: this.headers(false) });
      if (!res.ok) {
        const err = (res.json as { error?: MetaError } | null)?.error;
        throw new Error(`Meta template list failed: ${err?.message ?? res.networkError ?? `HTTP ${res.status}`}`);
      }
      const body = res.json as { data?: MetaTemplate[]; paging?: { next?: string } };
      out.push(...(body.data ?? []).map(toDefinition));
      url = body.paging?.next ?? null;
    }
    return out;
  }

  async getTemplate(name: string, language: string): Promise<TemplateDefinition | null> {
    const all = await this.listTemplates();
    return all.find((t) => t.name === name && t.language === language) ?? null;
  }

  async healthCheck(): Promise<{ ok: boolean; detail?: string; latencyMs?: number }> {
    if (!this.isConfigured()) return { ok: false, detail: "META_PHONE_NUMBER_ID / META_SYSTEM_USER_TOKEN not set" };
    const res = await http(`${this.base()}/${env().phoneNumberId}?fields=id,display_phone_number`, { headers: this.headers(false) });
    if (res.ok) return { ok: true, latencyMs: res.latencyMs, detail: `Number ${(res.json as { display_phone_number?: string })?.display_phone_number ?? ""}`.trim() };
    const err = (res.json as { error?: MetaError } | null)?.error;
    return { ok: false, latencyMs: res.latencyMs, detail: err?.message ?? res.networkError ?? `HTTP ${res.status}` };
  }

  async getAccountInfo(): Promise<AccountInfo | null> {
    if (!this.isConfigured()) return null;
    const res = await http(
      `${this.base()}/${env().phoneNumberId}?fields=display_phone_number,verified_name,quality_rating,messaging_limit_tier`,
      { headers: this.headers(false) },
    );
    if (!res.ok) return null;
    const b = res.json as { display_phone_number?: string; verified_name?: string; quality_rating?: string; messaging_limit_tier?: string };
    const q = (b.quality_rating ?? "UNKNOWN").toUpperCase();
    return {
      wabaId: env().wabaId || undefined,
      displayNumber: b.display_phone_number,
      verifiedName: b.verified_name,
      qualityRating: q === "GREEN" || q === "YELLOW" || q === "RED" ? q : "UNKNOWN",
      messagingLimit: b.messaging_limit_tier ? TIER_LIMITS[b.messaging_limit_tier] : undefined,
      messagingLimitLabel: b.messaging_limit_tier,
    };
  }

  async uploadMedia(file: Buffer, mimeType: string): Promise<string> {
    const form = new FormData();
    form.append("messaging_product", "whatsapp");
    form.append("type", mimeType);
    form.append("file", new Blob([new Uint8Array(file)], { type: mimeType }), "upload");
    const res = await http(`${this.base()}/${env().phoneNumberId}/media`, { method: "POST", headers: this.headers(false), body: form });
    const id = (res.json as { id?: string } | null)?.id;
    if (!res.ok || !id) throw new Error(`Meta media upload failed: ${res.networkError ?? res.text.slice(0, 200)}`);
    return id;
  }
}
