/**
 * Interakt BSP.
 *
 *   Base: https://api.interakt.ai/v1/public
 *   Send: POST /message/
 *   Auth: Authorization: Basic {API_KEY}  (Interakt issues the key already base64-encoded)
 *
 * Splits the number into countryCode + phoneNumber, and carries our metadata
 * in `callbackData`, which Interakt echoes back on its webhooks. Webhooks are
 * signed: Interakt-Signature = HMAC-SHA256(raw body, INTERAKT_WEBHOOK_SECRET).
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
import { digitsOnly, failureFrom, hmacSha256Hex, http, parseTimestamp, safeEqual, splitCountryCode, withBackoff } from "./_shared";

const BASE = "https://api.interakt.ai/v1/public";

const env = () => ({
  apiKey: process.env.INTERAKT_API_KEY ?? "",
  webhookSecret: process.env.INTERAKT_WEBHOOK_SECRET ?? "",
});

const STATUS_BY_TYPE: Record<string, DeliveryStatus> = {
  message_api_sent: "SENT",
  message_api_delivered: "DELIVERED",
  message_api_read: "READ",
  message_api_failed: "FAILED",
  message_campaign_sent: "SENT",
  message_campaign_delivered: "DELIVERED",
  message_campaign_read: "READ",
  message_campaign_failed: "FAILED",
};

const CONTENT_TYPES: Record<string, NormalisedInboundEvent["messageType"]> = {
  text: "text",
  image: "image",
  document: "document",
  audio: "audio",
  voice: "audio",
  video: "video",
  button: "button",
  interactivebuttonreply: "interactive",
  interactivelistreply: "interactive",
  location: "location",
};

type InteraktMessage = {
  id?: string;
  message?: string;
  message_content_type?: string;
  media_url?: string;
  received_at_utc?: string;
  message_status?: string;
  channel_failure_reason?: string;
  callback_data?: string;
};
type InteraktPayload = {
  type?: string;
  timestamp?: string;
  data?: {
    customer?: { phone_number?: string; country_code?: string; channel_phone_number?: string; traits?: { name?: string } };
    message?: InteraktMessage;
  };
};

export class InteraktProvider implements WhatsAppProvider {
  readonly name = "interakt" as const;
  readonly supportsTemplateManagement = false;
  readonly supportsMediaUpload = false;
  readonly supportsSessionMessages = true;

  configStatus() {
    return [
      { env: "INTERAKT_API_KEY", set: !!process.env.INTERAKT_API_KEY, required: true },
      { env: "INTERAKT_WEBHOOK_SECRET", set: !!process.env.INTERAKT_WEBHOOK_SECRET, required: true },
    ];
  }

  isConfigured(): boolean {
    return !!env().apiKey;
  }

  private post(body: Record<string, unknown>): Promise<SendResult> {
    return withBackoff(async () => {
      const res = await http(`${BASE}/message/`, {
        method: "POST",
        headers: { Authorization: `Basic ${env().apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = res.json as { result?: boolean; id?: string; message?: string } | null;
      if (res.ok && json?.result !== false && json?.id) return { ok: true, status: "ACCEPTED", providerMessageId: json.id, rawResponse: json };
      if (json?.message) {
        const errorCode = codeFromMessage(json.message) ?? (res.status === 401 || res.status === 403 ? "AUTH_FAILED" : res.status === 429 ? "RATE_LIMITED" : "UNKNOWN");
        return { ok: false, status: errorCode === "RATE_LIMITED" ? "RATE_LIMITED" : "FAILED", errorCode, errorMessage: json.message, rawResponse: json };
      }
      return failureFrom(res);
    });
  }

  private address(e164: string, idempotencyKey: string, metadata?: Record<string, string>) {
    const { countryCode, national } = splitCountryCode(e164);
    return { countryCode, phoneNumber: national, callbackData: JSON.stringify({ k: idempotencyKey, ...(metadata ?? {}) }).slice(0, 512) };
  }

  sendTemplate(p: SendTemplateParams): Promise<SendResult> {
    const template: Record<string, unknown> = { name: p.templateName, languageCode: p.languageCode, bodyValues: p.bodyParams ?? [] };
    if (p.headerParams) {
      template.headerValues = [p.headerParams.value];
      if (p.headerParams.type === "document") template.fileName = p.headerParams.value.split("/").pop() || "document";
    }
    if (p.buttonParams?.length) {
      template.buttonValues = Object.fromEntries(p.buttonParams.map((b) => [String(b.index), [b.value]]));
    }
    return this.post({ ...this.address(p.to, p.idempotencyKey, p.metadata), type: "Template", template });
  }

  sendSessionMessage(p: SendSessionParams): Promise<SendResult> {
    return this.post({ ...this.address(p.to, p.idempotencyKey, p.metadata), type: "Text", data: { message: p.text } });
  }

  async verifyWebhook(req: Request, rawBody: string): Promise<boolean> {
    const secret = env().webhookSecret;
    if (!secret) {
      console.error("[whatsapp:interakt] INTERAKT_WEBHOOK_SECRET is not set — rejecting webhook.");
      return false;
    }
    const provided = (req.headers.get("interakt-signature") ?? "").replace(/^sha256=/i, "");
    return !!provided && safeEqual(provided, hmacSha256Hex(secret, rawBody));
  }

  parseWebhook(payload: unknown): NormalisedInboundEvent[] {
    const items = Array.isArray(payload) ? payload : [payload];
    return items.map((raw) => {
      const p = (raw ?? {}) as InteraktPayload;
      const type = (p.type ?? "").toLowerCase();
      const customer = p.data?.customer;
      const msg = p.data?.message ?? {};
      const phone = customer?.phone_number ? `${customer.country_code ?? "+91"}${customer.phone_number}` : undefined;
      const from = phone ? `+${digitsOnly(phone)}` : undefined;
      const timestamp = parseTimestamp(msg.received_at_utc ?? p.timestamp);

      if (type === "message_received") {
        const ct = (msg.message_content_type ?? "text").toLowerCase().replace(/[^a-z]/g, "");
        const messageType = CONTENT_TYPES[ct] ?? "unsupported";
        return {
          eventType: "MESSAGE_RECEIVED",
          providerMessageId: msg.id,
          from,
          toWaba: customer?.channel_phone_number ? `+${digitsOnly(customer.channel_phone_number)}` : undefined,
          messageType,
          text: messageType === "text" || messageType === "button" || messageType === "interactive" ? msg.message : undefined,
          buttonPayload: messageType === "button" || messageType === "interactive" ? msg.message : undefined,
          mediaId: msg.media_url,
          senderName: customer?.traits?.name,
          timestamp,
          rawPayload: p,
        } satisfies NormalisedInboundEvent;
      }

      const deliveryStatus = STATUS_BY_TYPE[type];
      if (deliveryStatus && msg.id) {
        const reason = msg.channel_failure_reason;
        return {
          eventType: "STATUS_UPDATE",
          providerMessageId: msg.id,
          from,
          deliveryStatus,
          failureReason: deliveryStatus === "FAILED" ? reason : undefined,
          failureCode: deliveryStatus === "FAILED" ? codeFromMessage(reason) ?? undefined : undefined,
          timestamp,
          rawPayload: p,
        } satisfies NormalisedInboundEvent;
      }

      return { eventType: "UNKNOWN", timestamp, rawPayload: p } satisfies NormalisedInboundEvent;
    });
  }

  async listTemplates(): Promise<TemplateDefinition[]> {
    console.warn("[whatsapp:interakt] No template-management API wired for Interakt — returning no templates. Sync templates from Meta instead (META_WABA_ID + META_SYSTEM_USER_TOKEN).");
    return [];
  }

  async getTemplate(): Promise<TemplateDefinition | null> {
    return null;
  }

  async healthCheck(): Promise<{ ok: boolean; detail?: string; latencyMs?: number }> {
    if (!this.isConfigured()) return { ok: false, detail: "INTERAKT_API_KEY not set" };
    // An empty message body is rejected before anything is sent: 400 means the
    // key was accepted, 401 means it wasn't.
    const res = await http(`${BASE}/message/`, {
      method: "POST",
      headers: { Authorization: `Basic ${env().apiKey}`, "Content-Type": "application/json" },
      body: "{}",
      timeoutMs: 5000,
    });
    if (res.networkError) return { ok: false, detail: res.networkError, latencyMs: res.latencyMs };
    if (res.status === 401 || res.status === 403) return { ok: false, detail: "API key rejected", latencyMs: res.latencyMs };
    return { ok: res.status < 500, latencyMs: res.latencyMs, detail: `Reachable (HTTP ${res.status})` };
  }
}
