/**
 * AiSensy BSP.
 *
 *   Send: POST https://backend.aisensy.com/campaign/t1/api/v2
 *   Auth: the API key travels in the request BODY, not a header.
 *
 * Sends are campaign-shaped. Our template name is used as the AiSensy "API
 * campaign" name, so create one live API campaign per WABA template, named
 * exactly like the template. No template-management API, and no free-form
 * session send on this endpoint.
 *
 * Webhook shapes are not formally published; this parses the Meta-shaped
 * forward AiSensy can send, plus the flatter "topic/data" form, tolerantly.
 * Authenticity is a shared secret (?token= on the webhook URL, or the
 * x-aisensy-secret header). Verify against a live account before relying on it.
 */
import type {
  DeliveryStatus,
  NormalisedInboundEvent,
  SendResult,
  SendTemplateParams,
  TemplateDefinition,
  WhatsAppProvider,
} from "../types";
import { codeFromMessage } from "../errors";
import { digitsOnly, failureFrom, http, parseTimestamp, safeEqual, withBackoff } from "./_shared";
import { parseMetaPayload } from "./meta-cloud";

const ENDPOINT = "https://backend.aisensy.com/campaign/t1/api/v2";

const env = () => ({
  apiKey: process.env.AISENSY_API_KEY ?? "",
  webhookSecret: process.env.AISENSY_WEBHOOK_SECRET ?? "",
});

const STATUS_WORDS: Array<[RegExp, DeliveryStatus]> = [
  [/read/i, "READ"],
  [/deliver/i, "DELIVERED"],
  [/fail|error|reject/i, "FAILED"],
  [/sent|submitted|accepted/i, "SENT"],
];

type Flat = Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" && v ? v : typeof v === "number" ? String(v) : undefined);

export class AiSensyProvider implements WhatsAppProvider {
  readonly name = "aisensy" as const;
  readonly supportsTemplateManagement = false;
  readonly supportsMediaUpload = false;
  readonly supportsSessionMessages = false;

  configStatus() {
    return [
      { env: "AISENSY_API_KEY", set: !!process.env.AISENSY_API_KEY, required: true },
      { env: "AISENSY_WEBHOOK_SECRET", set: !!process.env.AISENSY_WEBHOOK_SECRET, required: true },
    ];
  }

  isConfigured(): boolean {
    return !!env().apiKey;
  }

  sendTemplate(p: SendTemplateParams): Promise<SendResult> {
    if (p.headerParams?.type === "text") {
      return Promise.resolve({
        ok: false,
        status: "FAILED",
        errorCode: "UNSUPPORTED_OPERATION",
        errorMessage: "AiSensy's campaign API does not take text header parameters",
      });
    }
    const body: Record<string, unknown> = {
      apiKey: env().apiKey,
      campaignName: p.templateName,
      destination: digitsOnly(p.to), // country code, no "+"
      userName: p.metadata?.userName || "Property Tiger user",
      source: "property-tiger",
      templateParams: p.bodyParams ?? [],
      attributes: { idempotencyKey: p.idempotencyKey, ...(p.metadata ?? {}) },
    };
    if (p.headerParams) body.media = { url: p.headerParams.value, filename: p.headerParams.value.split("/").pop() || "file" };
    if (p.buttonParams?.length) {
      body.buttons = p.buttonParams.map((b) => ({
        type: "button",
        sub_type: b.subType,
        index: b.index,
        parameters: [b.subType === "url" ? { type: "text", text: b.value } : { type: "payload", payload: b.value }],
      }));
    }

    return withBackoff(async () => {
      const res = await http(ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json = res.json as { success?: boolean | string; submitted_message_id?: string; messageId?: string; id?: string; message?: string; errorMessage?: string } | null;
      const success = json?.success === true || json?.success === "true";
      if (res.ok && success) {
        return { ok: true, status: "ACCEPTED", providerMessageId: json?.submitted_message_id || json?.messageId || json?.id, rawResponse: json };
      }
      const message = json?.errorMessage || json?.message;
      if (message) {
        const errorCode = codeFromMessage(message) ?? (res.status === 401 || res.status === 403 ? "AUTH_FAILED" : "UNKNOWN");
        return { ok: false, status: errorCode === "RATE_LIMITED" ? "RATE_LIMITED" : "FAILED", errorCode, errorMessage: message, rawResponse: json };
      }
      return failureFrom(res);
    });
  }

  async sendSessionMessage(): Promise<SendResult> {
    return {
      ok: false,
      status: "FAILED",
      errorCode: "UNSUPPORTED_OPERATION",
      errorMessage: "AiSensy's campaign API only sends approved templates — free-form replies are not available",
    };
  }

  async verifyWebhook(req: Request): Promise<boolean> {
    const secret = env().webhookSecret;
    if (!secret) {
      console.error("[whatsapp:aisensy] AISENSY_WEBHOOK_SECRET is not set — rejecting webhook.");
      return false;
    }
    const provided = new URL(req.url).searchParams.get("token") ?? req.headers.get("x-aisensy-secret") ?? "";
    return safeEqual(provided, secret);
  }

  parseWebhook(payload: unknown): NormalisedInboundEvent[] {
    if (payload && typeof payload === "object" && "entry" in payload) return parseMetaPayload(payload);
    const items = Array.isArray(payload) ? payload : [payload];
    return items.map((p) => this.parseFlat((p ?? {}) as Flat));
  }

  private parseFlat(p: Flat): NormalisedInboundEvent {
    const data = (p.data as Flat | undefined) ?? p;
    const msg = (data.message as Flat | undefined) ?? data;
    const topic = String(p.topic ?? p.event ?? p.type ?? "").toLowerCase();
    const timestamp = parseTimestamp(msg.timestamp ?? p.timestamp);
    const phone = str(msg.phone_number) ?? str(msg.from) ?? str(msg.waId) ?? str(data.phone_number) ?? str((data.contact as Flat | undefined)?.phone_number);
    const from = phone ? `+${digitsOnly(phone)}` : undefined;
    const id = str(msg.messageId) ?? str(msg.id) ?? str(msg.wamid) ?? str(data.messageId);

    const isInbound = /sender\.user|message\.received|incoming|inbound/.test(topic) || msg.sender === "USER" || msg.direction === "inbound";
    if (isInbound) {
      const contentType = String(msg.message_type ?? msg.type ?? "text").toLowerCase();
      const content = msg.message_content as Flat | string | undefined;
      const text = typeof content === "string" ? content : str(content?.text) ?? str(msg.text) ?? str(msg.body);
      const known = ["text", "image", "document", "audio", "video", "button", "interactive", "location"];
      return {
        eventType: "MESSAGE_RECEIVED",
        providerMessageId: id,
        from,
        messageType: (known.includes(contentType) ? contentType : "unsupported") as NormalisedInboundEvent["messageType"],
        text,
        senderName: str(msg.userName) ?? str(msg.name) ?? str((data.contact as Flat | undefined)?.name),
        timestamp,
        rawPayload: p,
      };
    }

    const statusWord = str(msg.status) ?? str(p.status) ?? topic;
    const deliveryStatus = STATUS_WORDS.find(([re]) => re.test(statusWord ?? ""))?.[1];
    if (id && deliveryStatus) {
      const reason = str(msg.failureReason) ?? str(msg.error) ?? str(msg.reason);
      return {
        eventType: "STATUS_UPDATE",
        providerMessageId: id,
        from,
        deliveryStatus,
        failureReason: deliveryStatus === "FAILED" ? reason : undefined,
        failureCode: deliveryStatus === "FAILED" ? codeFromMessage(reason) ?? undefined : undefined,
        timestamp,
        rawPayload: p,
      };
    }
    return { eventType: "UNKNOWN", timestamp, rawPayload: p };
  }

  async listTemplates(): Promise<TemplateDefinition[]> {
    console.warn("[whatsapp:aisensy] AiSensy has no template-management API — returning no templates. Sync templates from Meta instead (META_WABA_ID + META_SYSTEM_USER_TOKEN).");
    return [];
  }

  async getTemplate(): Promise<TemplateDefinition | null> {
    return null;
  }

  async healthCheck(): Promise<{ ok: boolean; detail?: string; latencyMs?: number }> {
    if (!this.isConfigured()) return { ok: false, detail: "AISENSY_API_KEY not set" };
    // No read-only endpoint exists, so this proves reachability only; the key
    // itself is proven by the first real send.
    const res = await http(ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}", timeoutMs: 5000 });
    if (res.networkError) return { ok: false, detail: res.networkError, latencyMs: res.latencyMs };
    return { ok: res.status < 500, latencyMs: res.latencyMs, detail: `Reachable (HTTP ${res.status}); API key is verified on first send` };
  }
}
