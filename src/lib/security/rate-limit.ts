/**
 * Rate limits that hold across every server instance: one atomic upsert on
 * the RateLimit table per check (fixed window). If the database can't be
 * reached the request is allowed — a limiter outage must not lock everyone out.
 */
import prisma from "../prisma";

export interface Limit {
  /** Allowed hits per window */
  max: number;
  windowSec: number;
}

export const LIMITS = {
  loginEmail: { max: 8, windowSec: 15 * 60 },
  loginIp: { max: 30, windowSec: 15 * 60 },
  signupIp: { max: 6, windowSec: 60 * 60 },
  resetEmail: { max: 3, windowSec: 60 * 60 },
  resetIp: { max: 10, windowSec: 60 * 60 },
  enquiryIp: { max: 12, windowSec: 60 * 60 },
  enquiryPhone: { max: 6, windowSec: 24 * 60 * 60 },
  researchIp: { max: 10, windowSec: 60 * 60 },
  savedSearchUser: { max: 20, windowSec: 60 * 60 },
} satisfies Record<string, Limit>;

export type Bucket = keyof typeof LIMITS;

export interface LimitResult {
  ok: boolean;
  count: number;
  retryAfterSec: number;
}

export async function hit(bucket: Bucket, subject: string, now = new Date()): Promise<LimitResult> {
  const { max, windowSec } = LIMITS[bucket];
  const key = `${bucket}:${subject.toLowerCase().slice(0, 200)}`;
  const reset = new Date(now.getTime() + windowSec * 1000);
  try {
    const rows = await prisma.$queryRaw<{ count: number; resetAt: Date }[]>`
      INSERT INTO "RateLimit" ("key", "count", "resetAt") VALUES (${key}, 1, ${reset})
      ON CONFLICT ("key") DO UPDATE SET
        "count"   = CASE WHEN "RateLimit"."resetAt" <= ${now} THEN 1 ELSE "RateLimit"."count" + 1 END,
        "resetAt" = CASE WHEN "RateLimit"."resetAt" <= ${now} THEN ${reset} ELSE "RateLimit"."resetAt" END
      RETURNING "count", "resetAt"`;
    const row = rows[0];
    const count = Number(row.count);
    return { ok: count <= max, count, retryAfterSec: Math.max(1, Math.ceil((new Date(row.resetAt).getTime() - now.getTime()) / 1000)) };
  } catch (e) {
    console.error("[rate-limit] check failed, allowing request", e);
    return { ok: true, count: 0, retryAfterSec: 0 };
  }
}

/** Clears a counter (e.g. after a successful login). */
export async function clear(bucket: Bucket, subject: string) {
  await prisma.rateLimit.deleteMany({ where: { key: `${bucket}:${subject.toLowerCase().slice(0, 200)}` } }).catch(() => null);
}

/** The client's IP as Vercel reports it (first hop of x-forwarded-for). */
export function clientIp(headers: Headers | Record<string, string | string[] | undefined>): string {
  const get = (k: string) => (headers instanceof Headers ? headers.get(k) : ([] as (string | undefined)[]).concat(headers[k] as string)[0]) ?? null;
  return get("x-real-ip") || get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

/** A 429 response with Retry-After. */
export function tooMany(r: LimitResult, message = "Too many requests. Please try again later.") {
  return Response.json({ error: message }, { status: 429, headers: { "Retry-After": String(r.retryAfterSec) } });
}
