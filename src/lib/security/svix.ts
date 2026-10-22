/**
 * Verifies a Svix-signed webhook (Resend uses Svix): HMAC-SHA256 over
 * "<svix-id>.<svix-timestamp>.<raw body>" with the endpoint secret
 * ("whsec_<base64>"), compared against every "v1,<base64>" in svix-signature,
 * and a timestamp within 5 minutes to stop replays. Pure: tested in security.test.ts.
 */
import { createHmac } from "node:crypto";
import { safeEqual } from "./compare";

export const SVIX_TOLERANCE_SEC = 5 * 60;

export function svixSignature(secret: string, id: string, timestamp: string, body: string): string {
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  return createHmac("sha256", key).update(`${id}.${timestamp}.${body}`).digest("base64");
}

export function verifySvix(secret: string, headers: Headers, body: string, now = Date.now()): boolean {
  const id = headers.get("svix-id");
  const ts = headers.get("svix-timestamp");
  const sigs = headers.get("svix-signature");
  if (!id || !ts || !sigs) return false;
  const t = Number(ts);
  if (!Number.isFinite(t) || Math.abs(now / 1000 - t) > SVIX_TOLERANCE_SEC) return false;
  const expected = svixSignature(secret, id, ts, body);
  return sigs.split(" ").some((s) => {
    const [version, sig] = s.split(",");
    return version === "v1" && safeEqual(sig, expected);
  });
}
