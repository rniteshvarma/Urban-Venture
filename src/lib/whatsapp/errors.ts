/**
 * The fixed set of WhatsApp failure reasons. Every adapter maps its
 * provider's errors onto these; application code branches only on them.
 */
export type WhatsAppErrorCode =
  | "INVALID_NUMBER" // malformed or not on WhatsApp
  | "NOT_OPTED_IN" // user has not opted in / blocked
  | "TEMPLATE_NOT_FOUND"
  | "TEMPLATE_NOT_APPROVED"
  | "TEMPLATE_PARAM_MISMATCH"
  | "OUTSIDE_SESSION_WINDOW" // free-form attempted after 24h
  | "RATE_LIMITED"
  | "QUOTA_EXCEEDED" // messaging tier limit reached
  | "AUTH_FAILED"
  | "INSUFFICIENT_BALANCE" // BSP wallet empty
  | "MEDIA_ERROR"
  | "PROVIDER_UNAVAILABLE"
  | "UNSUPPORTED_OPERATION" // e.g. free-form text on a BSP whose API has no session send
  | "UNKNOWN";

export const WHATSAPP_ERROR_CODES: WhatsAppErrorCode[] = [
  "INVALID_NUMBER",
  "NOT_OPTED_IN",
  "TEMPLATE_NOT_FOUND",
  "TEMPLATE_NOT_APPROVED",
  "TEMPLATE_PARAM_MISMATCH",
  "OUTSIDE_SESSION_WINDOW",
  "RATE_LIMITED",
  "QUOTA_EXCEEDED",
  "AUTH_FAILED",
  "INSUFFICIENT_BALANCE",
  "MEDIA_ERROR",
  "PROVIDER_UNAVAILABLE",
  "UNSUPPORTED_OPERATION",
  "UNKNOWN",
];

const RETRYABLE = new Set<WhatsAppErrorCode>(["RATE_LIMITED", "PROVIDER_UNAVAILABLE", "UNKNOWN"]);

/** Worth another attempt later. Everything else will fail the same way again. */
export function isRetryable(code: WhatsAppErrorCode | undefined | null): boolean {
  return !!code && RETRYABLE.has(code);
}

/** The number itself is the problem: stop messaging it. */
export function shouldSuppress(code: WhatsAppErrorCode | undefined | null): boolean {
  return code === "INVALID_NUMBER" || code === "NOT_OPTED_IN";
}

/** HTTP status → a normalised code, for when the body tells us nothing better. */
export function codeFromHttpStatus(status: number): WhatsAppErrorCode {
  if (status === 401 || status === 403) return "AUTH_FAILED";
  if (status === 429) return "RATE_LIMITED";
  if (status === 402) return "INSUFFICIENT_BALANCE";
  if (status >= 500) return "PROVIDER_UNAVAILABLE";
  return "UNKNOWN";
}

/**
 * Best-effort mapping from a BSP's free-text error message. BSPs rarely
 * return stable codes, so this is the fallback every non-Meta adapter uses.
 */
export function codeFromMessage(message: string | undefined | null): WhatsAppErrorCode | null {
  if (!message) return null;
  const m = message.toLowerCase();
  if (/(balance|wallet|credit|recharge|insufficient fund)/.test(m)) return "INSUFFICIENT_BALANCE";
  if (/(not (a )?valid (whatsapp )?(number|user)|invalid (phone|number|destination|whatsapp)|not on whatsapp|undeliverable)/.test(m)) return "INVALID_NUMBER";
  if (/(opt(ed)?[- ]?out|opt[- ]?in|blocked|stopped|unsubscribed)/.test(m)) return "NOT_OPTED_IN";
  if (/(24[- ]?hour|session (window|expired|closed)|re-?engagement|outside.*window)/.test(m)) return "OUTSIDE_SESSION_WINDOW";
  if (/(param|variable|placeholder).*(mismatch|missing|count|required|invalid)|(mismatch|missing).*(param|variable)/.test(m)) return "TEMPLATE_PARAM_MISMATCH";
  if (/template.*(not approved|paused|disabled|rejected|pending)|campaign.*(not live|paused|inactive)/.test(m)) return "TEMPLATE_NOT_APPROVED";
  if (/(template|campaign).*(not found|does not exist|doesn't exist|invalid name|no such)/.test(m)) return "TEMPLATE_NOT_FOUND";
  if (/(rate limit|too many requests|throttl)/.test(m)) return "RATE_LIMITED";
  if (/(quota|tier limit|messaging limit)/.test(m)) return "QUOTA_EXCEEDED";
  if (/(unauthori[sz]ed|forbidden|invalid (api )?(key|token)|authentication)/.test(m)) return "AUTH_FAILED";
  if (/(media|image|document|video).*(fail|invalid|download|upload)/.test(m)) return "MEDIA_ERROR";
  if (/(timeout|timed out|unavailable|econnreset|enotfound|fetch failed|bad gateway)/.test(m)) return "PROVIDER_UNAVAILABLE";
  return null;
}
