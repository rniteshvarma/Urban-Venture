/**
 * The provider-neutral WhatsApp contract. Every adapter in ./providers/
 * implements WhatsAppProvider; nothing outside ./providers/ knows which
 * provider is live. All four providers sit on the same Meta Cloud API, so
 * templates approved on our WABA carry over when the provider changes.
 */
import type { WhatsAppErrorCode } from "./errors";

export type ProviderName = "meta-cloud" | "aisensy" | "interakt" | "wati";

export const PROVIDER_NAMES: ProviderName[] = ["meta-cloud", "aisensy", "interakt", "wati"];

export const PROVIDER_LABELS: Record<ProviderName, string> = {
  "meta-cloud": "Meta Cloud API (direct)",
  aisensy: "AiSensy",
  interakt: "Interakt",
  wati: "WATI",
};

export type MessageCategory = "MARKETING" | "UTILITY" | "AUTHENTICATION" | "SERVICE";

export interface SendTemplateParams {
  to: string; // E.164, always +91XXXXXXXXXX
  templateName: string; // as registered on the WABA
  languageCode: string; // "en", "en_US", "te"
  bodyParams?: string[]; // positional {{1}}, {{2}}...
  headerParams?: {
    type: "text" | "image" | "document" | "video";
    value: string; // text or a public https URL
  };
  buttonParams?: Array<{
    subType: "url" | "quick_reply";
    index: number;
    value: string; // dynamic URL suffix or payload
  }>;
  category: MessageCategory; // for cost attribution, not for the API
  idempotencyKey: string; // OUR key — see send.ts
  metadata?: Record<string, string>; // leadId, reportId etc. for our own logs
}

export interface SendSessionParams {
  to: string;
  text: string; // free-form, only inside the 24h window
  idempotencyKey: string;
  metadata?: Record<string, string>;
}

/** Tap-to-reply buttons (≤3) or a list (≤10 rows), sent inside the 24h window. */
export interface SendInteractiveParams {
  to: string;
  body: string; // ≤1024 chars
  buttons?: Array<{ id: string; title: string }>; // title ≤20
  list?: { button: string; rows: Array<{ id: string; title: string; description?: string }> }; // title ≤24, description ≤72
  idempotencyKey: string;
  metadata?: Record<string, string>;
}

export interface SendResult {
  ok: boolean;
  providerMessageId?: string;
  status: "ACCEPTED" | "FAILED" | "RATE_LIMITED" | "DUPLICATE";
  errorCode?: WhatsAppErrorCode; // NORMALISED
  errorMessage?: string;
  rawResponse?: unknown; // stored for debugging, never parsed elsewhere
  /** Adapters retry transient failures internally; this is how many tries it took. */
  attempts?: number;
}

export type DeliveryStatus = "SENT" | "DELIVERED" | "READ" | "FAILED";
export type TemplateStatus = "APPROVED" | "REJECTED" | "PENDING" | "PAUSED" | "DISABLED";

/**
 * Every provider's webhook is normalised to THIS shape before it reaches any
 * application code.
 */
export interface NormalisedInboundEvent {
  eventType: "MESSAGE_RECEIVED" | "STATUS_UPDATE" | "TEMPLATE_STATUS" | "ACCOUNT_UPDATE" | "UNKNOWN";
  providerMessageId?: string;
  from?: string; // E.164
  toWaba?: string;
  // For MESSAGE_RECEIVED
  messageType?: "text" | "image" | "document" | "audio" | "video" | "button" | "interactive" | "location" | "unsupported";
  text?: string;
  buttonPayload?: string;
  mediaId?: string;
  senderName?: string;
  // For STATUS_UPDATE
  deliveryStatus?: DeliveryStatus;
  failureReason?: string;
  failureCode?: WhatsAppErrorCode; // normalised, so FAILED receipts can suppress bad numbers
  // For TEMPLATE_STATUS
  templateName?: string;
  templateLanguage?: string;
  templateStatus?: TemplateStatus;
  rejectionReason?: string;
  // For ACCOUNT_UPDATE (number quality / messaging-tier changes)
  qualityRating?: "GREEN" | "YELLOW" | "RED" | "UNKNOWN";
  messagingLimit?: string;
  // Always
  timestamp: Date;
  rawPayload: unknown;
}

export interface TemplateDefinition {
  name: string;
  language: string;
  category: "MARKETING" | "UTILITY" | "AUTHENTICATION";
  status: TemplateStatus;
  components: unknown; // provider-shaped, used for display only
  /** Parsed shape, used for pre-send validation. */
  bodyParamCount: number;
  hasHeaderParam: boolean;
  headerType?: string;
  buttonCount: number; // buttons that need a dynamic parameter
  bodyText?: string;
  rejectionReason?: string;
}

export interface AccountInfo {
  wabaId?: string;
  displayNumber?: string;
  verifiedName?: string;
  qualityRating?: "GREEN" | "YELLOW" | "RED" | "UNKNOWN";
  /** Unique recipients per rolling 24h, when the provider reports it. */
  messagingLimit?: number;
  messagingLimitLabel?: string;
}

export interface WhatsAppProvider {
  readonly name: ProviderName;
  readonly supportsTemplateManagement: boolean;
  readonly supportsMediaUpload: boolean;
  readonly supportsSessionMessages: boolean;

  /** Credentials present. When false the factory wraps the adapter in a dry run. */
  isConfigured(): boolean;
  /** Which env vars this adapter reads, and whether each is set (never the values). */
  configStatus(): Array<{ env: string; set: boolean; required: boolean }>;

  sendTemplate(params: SendTemplateParams): Promise<SendResult>;
  sendSessionMessage(params: SendSessionParams): Promise<SendResult>;
  /** Interactive buttons / list. Optional — callers fall back to numbered text. */
  sendInteractive?(params: SendInteractiveParams): Promise<SendResult>;

  /** Verify a webhook request is genuinely from the provider. Fails closed. */
  verifyWebhook(req: Request, rawBody: string): Promise<boolean>;
  /** Convert the provider's payload into our shape. */
  parseWebhook(payload: unknown): NormalisedInboundEvent[];
  /** GET-challenge handshake (Meta requires this; BSPs mostly don't). */
  handleWebhookChallenge?(req: Request): Response | null;

  listTemplates(): Promise<TemplateDefinition[]>;
  getTemplate(name: string, language: string): Promise<TemplateDefinition | null>;

  healthCheck(): Promise<{ ok: boolean; detail?: string; latencyMs?: number }>;
  getAccountInfo?(): Promise<AccountInfo | null>;
  uploadMedia?(file: Buffer, mimeType: string): Promise<string>;
}
