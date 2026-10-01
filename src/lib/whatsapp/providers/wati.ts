/**
 * WATI — kept for rollback only. This is the pre-abstraction behaviour ported
 * into the adapter shape as-is (same endpoints, same phone formatting, same
 * message-id fallbacks, same shared-secret webhook check). Do not improve it.
 *
 *   Base: {WATI_API_URL}   (WATI_API_ENDPOINT is still read — the old name)
 *   Auth: Authorization: Bearer {WATI_API_TOKEN}
 */
import type {
  DeliveryStatus,
  NormalisedInboundEvent,
  SendResult,
  SendSessionParams,
  SendTemplateParams,
  TemplateDefinition,
  WhatsAppProvider,
} from "../types";
import { codeFromMessage } from "../errors";
import { countPlaceholders, failureFrom, http, normaliseTemplateCategory, normaliseTemplateStatus, parseTimestamp, safeEqual } from "./_shared";

const env = () => ({
  base: (process.env.WATI_API_URL || process.env.WATI_API_ENDPOINT || "").replace(/\/+$/, ""),
  token: process.env.WATI_API_TOKEN ?? "",
  webhookSecret: process.env.WATI_WEBHOOK_SECRET ?? "",
});

/** Unchanged from the old code: country code, no "+", e.g. 919876543210. */
function cleanPhone(e164: string): string {
  let clean = e164.replace(/\D/g, "");
  if (clean.length === 10 && (clean.startsWith("7") || clean.startsWith("8") || clean.startsWith("9"))) clean = "91" + clean;
  return clean;
}

function messageIdFrom(json: unknown, fallback: string): string {
  const j = json as { message?: { id?: string }; id?: string } | null;
  return j?.message?.id || j?.id || fallback;
}

type WatiBody = {
  id?: string;
  messageId?: string;
  waMessageId?: string;
  whatsappMessageId?: string;
  statusString?: string;
  status?: string;
  eventType?: string;
  type?: string;
  waId?: string;
  phone?: string;
  from?: string;
  senderName?: string;
  name?: string;
  text?: string | { body?: string };
  message?: string;
  data?: { text?: string };
  owner?: boolean;
  timestamp?: string | number;
  listReply?: { id?: string; title?: string };
  buttonReply?: { payload?: string; text?: string };
};

export class WatiProvider implements WhatsAppProvider {
  readonly name = "wati" as const;
  readonly supportsTemplateManagement = true;
  readonly supportsMediaUpload = false;
  readonly supportsSessionMessages = true;

  configStatus() {
    return [
      { env: "WATI_API_URL", set: !!(process.env.WATI_API_URL || process.env.WATI_API_ENDPOINT), required: true },
      { env: "WATI_API_TOKEN", set: !!process.env.WATI_API_TOKEN, required: true },
      { env: "WATI_WEBHOOK_SECRET", set: !!process.env.WATI_WEBHOOK_SECRET, required: true },
    ];
  }

  isConfigured(): boolean {
    // The old code's mock-mode test, inverted.
    const { base, token } = env();
    return !(!base || base.includes("XXXXX") || base.includes("mock") || !token || token.includes("mock"));
  }

  private headers(): Record<string, string> {
    return { Authorization: `Bearer ${env().token}`, "Content-Type": "application/json" };
  }

  async sendSessionMessage(p: SendSessionParams): Promise<SendResult> {
    const res = await http(
      `${env().base}/api/v1/sendSessionMessage/${cleanPhone(p.to)}?messageText=${encodeURIComponent(p.text)}`,
      { method: "POST", headers: this.headers() },
    );
    if (res.ok) return { ok: true, status: "ACCEPTED", providerMessageId: messageIdFrom(res.json, "wati-sent-id"), rawResponse: res.json, attempts: 1 };
    return { ...failureFrom(res), attempts: 1 };
  }

  async sendTemplate(p: SendTemplateParams): Promise<SendResult> {
    const res = await http(`${env().base}/api/v1/sendTemplateMessage?whatsappNumber=${cleanPhone(p.to)}`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        template_name: p.templateName,
        broadcast_name: p.templateName,
        parameters: (p.bodyParams ?? []).map((value, i) => ({ name: String(i + 1), value })),
      }),
    });
    const body = res.json as { result?: boolean; info?: string } | null;
    if (res.ok && body?.result !== false) {
      return { ok: true, status: "ACCEPTED", providerMessageId: messageIdFrom(res.json, "wati-sent-id"), rawResponse: res.json, attempts: 1 };
    }
    if (res.ok && body?.info) {
      return { ok: false, status: "FAILED", errorCode: codeFromMessage(body.info) ?? "UNKNOWN", errorMessage: body.info, rawResponse: body, attempts: 1 };
    }
    return { ...failureFrom(res), attempts: 1 };
  }

  async verifyWebhook(req: Request): Promise<boolean> {
    const secret = env().webhookSecret;
    if (!secret) {
      console.error("[whatsapp:wati] WATI_WEBHOOK_SECRET is not set — rejecting webhook.");
      return false;
    }
    const provided = req.headers.get("x-wati-signature") ?? req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
    return safeEqual(provided, secret);
  }

  parseWebhook(payload: unknown): NormalisedInboundEvent[] {
    const items = Array.isArray(payload) ? payload : [payload];
    return items.map((raw) => this.parseOne((raw ?? {}) as WatiBody));
  }

  private parseOne(body: WatiBody): NormalisedInboundEvent {
    const timestamp = parseTimestamp(body.timestamp);
    const waId = body.waId || body.phone || body.from;
    const inbound = body.eventType === "message" || (body.owner === false && !!waId) || (!!waId && !body.statusString && !body.status);

    if (inbound) {
      const type = (body.type || "text").toLowerCase();
      const text = typeof body.text === "string" ? body.text : body.text?.body || body.message || body.data?.text;
      const known = ["text", "image", "document", "audio", "video", "button", "interactive", "location"] as const;
      return {
        eventType: "MESSAGE_RECEIVED",
        providerMessageId: body.whatsappMessageId || body.id || body.messageId,
        from: waId ? `+${String(waId).replace(/\D/g, "")}` : undefined,
        messageType: (known as readonly string[]).includes(type) ? (type as (typeof known)[number]) : type === "user_message" ? "text" : "unsupported",
        text: text || undefined,
        buttonPayload: body.listReply?.id || body.buttonReply?.payload,
        senderName: body.senderName || body.name,
        timestamp,
        rawPayload: body,
      };
    }

    const messageId = body.messageId || body.id || body.waMessageId;
    const rawStatus = String(body.statusString || body.status || body.eventType || "").toUpperCase();
    let deliveryStatus: DeliveryStatus | undefined;
    if (rawStatus.includes("READ")) deliveryStatus = "READ";
    else if (rawStatus.includes("DELIVERED")) deliveryStatus = "DELIVERED";
    else if (rawStatus.includes("SENT")) deliveryStatus = "SENT";
    else if (rawStatus.includes("FAILED")) deliveryStatus = "FAILED";

    if (!messageId || !deliveryStatus) return { eventType: "UNKNOWN", timestamp, rawPayload: body };
    return { eventType: "STATUS_UPDATE", providerMessageId: messageId, deliveryStatus, timestamp, rawPayload: body };
  }

  async listTemplates(): Promise<TemplateDefinition[]> {
    const res = await http(`${env().base}/api/v1/getMessageTemplates?pageSize=500`, { headers: this.headers() });
    if (!res.ok) throw new Error(`WATI template list failed: ${res.networkError ?? `HTTP ${res.status}`}`);
    type WatiTemplate = {
      elementName?: string;
      category?: string;
      status?: string;
      language?: { value?: string; key?: string } | string;
      body?: string;
      bodyOriginal?: string;
      header?: { typeString?: string; text?: string } | null;
      buttons?: Array<{ type?: string; parameter?: { url?: string } }>;
    };
    const list = ((res.json as { messageTemplates?: WatiTemplate[] })?.messageTemplates ?? []).filter((t) => t.elementName);
    return list.map((t) => {
      const lang = typeof t.language === "string" ? t.language : t.language?.value || t.language?.key || "en";
      const headerType = t.header?.typeString?.toLowerCase();
      const body = t.bodyOriginal || t.body;
      return {
        name: t.elementName!,
        language: lang,
        category: normaliseTemplateCategory(t.category),
        status: normaliseTemplateStatus(t.status),
        components: t,
        bodyParamCount: countPlaceholders(body),
        hasHeaderParam: !!headerType && (headerType === "text" ? countPlaceholders(t.header?.text) > 0 : true),
        headerType,
        buttonCount: (t.buttons ?? []).filter((b) => /\{\{/.test(b.parameter?.url ?? "")).length,
        bodyText: body,
      };
    });
  }

  async getTemplate(name: string, language: string): Promise<TemplateDefinition | null> {
    return (await this.listTemplates()).find((t) => t.name === name && t.language === language) ?? null;
  }

  async healthCheck(): Promise<{ ok: boolean; detail?: string; latencyMs?: number }> {
    if (!this.isConfigured()) return { ok: false, detail: "WATI_API_URL / WATI_API_TOKEN not set" };
    const res = await http(`${env().base}/api/v1/getMessageTemplates?pageSize=1`, { headers: this.headers() });
    return { ok: res.ok, latencyMs: res.latencyMs, detail: res.ok ? undefined : res.networkError ?? `HTTP ${res.status}` };
  }
}
