/**
 * Plumbing shared by the adapters: HTTP with a timeout, exponential backoff
 * for transient failures, webhook signature helpers and template-shape
 * parsing. Lives under providers/ because only adapters may use it.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import type { SendResult, TemplateDefinition, TemplateStatus } from "../types";
import { codeFromHttpStatus, codeFromMessage } from "../errors";

export interface HttpResult {
  ok: boolean;
  status: number;
  json: unknown;
  text: string;
  networkError?: string;
  latencyMs: number;
}

export async function http(url: string, init: RequestInit & { timeoutMs?: number } = {}): Promise<HttpResult> {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), init.timeoutMs ?? 10_000);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    const text = await res.text();
    let json: unknown = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
    return { ok: res.ok, status: res.status, json, text, latencyMs: Date.now() - started };
  } catch (err) {
    const message = err instanceof Error ? (err.name === "AbortError" ? "Request timed out" : err.message) : String(err);
    return { ok: false, status: 0, json: null, text: "", networkError: message, latencyMs: Date.now() - started };
  } finally {
    clearTimeout(timer);
  }
}

/** A generic failure result from an HTTP response, when the adapter has nothing more specific. */
export function failureFrom(res: HttpResult, message?: string): SendResult {
  if (res.networkError) {
    return { ok: false, status: "FAILED", errorCode: "PROVIDER_UNAVAILABLE", errorMessage: res.networkError, rawResponse: null };
  }
  const text = message ?? (res.text.slice(0, 500) || `HTTP ${res.status}`);
  const code = codeFromMessage(text) ?? codeFromHttpStatus(res.status);
  return {
    ok: false,
    status: code === "RATE_LIMITED" ? "RATE_LIMITED" : "FAILED",
    errorCode: code,
    errorMessage: text,
    rawResponse: res.json ?? res.text,
  };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Retry a send while it fails with RATE_LIMITED or PROVIDER_UNAVAILABLE,
 * backing off exponentially (with jitter). Kept short — this runs inside a
 * serverless request. Longer-horizon retries are the caller's job.
 */
export async function withBackoff(fn: () => Promise<SendResult>, opts: { maxAttempts?: number; baseMs?: number } = {}): Promise<SendResult> {
  const maxAttempts = opts.maxAttempts ?? 3;
  const baseMs = opts.baseMs ?? 500;
  let result: SendResult = { ok: false, status: "FAILED", errorCode: "UNKNOWN" };
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    result = await fn();
    result.attempts = attempt;
    const transient = result.errorCode === "RATE_LIMITED" || result.errorCode === "PROVIDER_UNAVAILABLE";
    if (result.ok || !transient || attempt === maxAttempts) return result;
    await sleep(baseMs * 2 ** (attempt - 1) + Math.floor(Math.random() * 150));
  }
  return result;
}

export function hmacSha256Hex(secret: string, body: string): string {
  return createHmac("sha256", secret).update(body, "utf8").digest("hex");
}

/** Constant-time string comparison. */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/** Unix seconds, unix ms or an ISO string → Date (now, when unparseable). */
export function parseTimestamp(raw: unknown): Date {
  if (raw === undefined || raw === null || raw === "") return new Date();
  const n = Number(raw);
  if (Number.isFinite(n) && n > 0) return new Date(n < 1e12 ? n * 1000 : n);
  const d = new Date(String(raw));
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

/** "+919876543210" → "919876543210" */
export function digitsOnly(e164: string): string {
  return e164.replace(/\D/g, "");
}

/** Country codes our buyers actually dial from (India + the NRI corridors). Longest first. */
const COUNTRY_CODES = ["971", "966", "974", "968", "965", "973", "353", "91", "44", "65", "61", "64", "49", "33", "31", "27", "60", "1"];

export function splitCountryCode(e164: string): { countryCode: string; national: string } {
  const digits = digitsOnly(e164);
  const cc = COUNTRY_CODES.find((c) => digits.startsWith(c) && digits.length - c.length >= 6) ?? digits.slice(0, 2);
  return { countryCode: `+${cc}`, national: digits.slice(cc.length) };
}

/** Distinct {{1}} / {{name}} placeholders in a template string. */
export function countPlaceholders(text: string | null | undefined): number {
  if (!text) return 0;
  return new Set(Array.from(text.matchAll(/\{\{\s*([\w.]+)\s*\}\}/g), (m) => m[1])).size;
}

export function normaliseTemplateStatus(raw: unknown): TemplateStatus {
  const s = String(raw ?? "").toUpperCase();
  if (s === "APPROVED" || s === "ACTIVE") return "APPROVED";
  if (s === "REJECTED") return "REJECTED";
  if (s === "PAUSED" || s === "FLAGGED") return "PAUSED";
  if (s === "DISABLED" || s === "DELETED" || s === "ARCHIVED" || s === "PENDING_DELETION") return "DISABLED";
  return "PENDING";
}

export function normaliseTemplateCategory(raw: unknown): TemplateDefinition["category"] {
  const s = String(raw ?? "").toUpperCase();
  if (s === "MARKETING") return "MARKETING";
  if (s === "AUTHENTICATION" || s === "OTP") return "AUTHENTICATION";
  return "UTILITY";
}

type MetaComponent = {
  type?: string;
  format?: string;
  text?: string;
  buttons?: Array<{ type?: string; url?: string; otp_type?: string }>;
};

/**
 * Meta-shaped template components → the parameter shape we validate against.
 * Media headers always take a parameter; authentication templates' OTP
 * (copy-code) button takes the code as a URL parameter.
 */
export function parseMetaComponents(components: unknown): Pick<TemplateDefinition, "bodyParamCount" | "hasHeaderParam" | "headerType" | "buttonCount" | "bodyText"> {
  const list = Array.isArray(components) ? (components as MetaComponent[]) : [];
  const header = list.find((c) => c.type?.toUpperCase() === "HEADER");
  const body = list.find((c) => c.type?.toUpperCase() === "BODY");
  const buttons = list.find((c) => c.type?.toUpperCase() === "BUTTONS")?.buttons ?? [];
  const headerFormat = header?.format?.toUpperCase();
  const hasHeaderParam = !!header && (headerFormat === "TEXT" ? countPlaceholders(header.text) > 0 : !!headerFormat && headerFormat !== "LOCATION");
  const buttonCount = buttons.filter((b) => {
    const t = b.type?.toUpperCase();
    return (t === "URL" && /\{\{/.test(b.url ?? "")) || t === "OTP" || t === "COPY_CODE";
  }).length;
  return {
    bodyParamCount: countPlaceholders(body?.text),
    hasHeaderParam,
    headerType: headerFormat?.toLowerCase(),
    buttonCount,
    bodyText: body?.text,
  };
}
