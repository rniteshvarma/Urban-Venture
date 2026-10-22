/**
 * Authenticates a Google Cloud Pub/Sub push request (the Gmail webhook).
 *
 * Accepts either
 *   - a Google-signed OIDC token (subscription "Enable authentication"):
 *     Authorization: Bearer <jwt>, issuer accounts.google.com, audience
 *     GMAIL_PUSH_AUDIENCE, and — when GMAIL_PUSH_SERVICE_ACCOUNT is set — that
 *     service account as the token's email; or
 *   - a shared secret in the push URL: /api/webhooks/gmail?token=GMAIL_PUSH_TOKEN.
 * With neither configured the endpoint is closed in production (fails closed).
 */
import { createRemoteJWKSet, jwtVerify } from "jose";
import { safeEqual } from "./compare";

const GOOGLE_JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

export type PushAuth = { ok: true; via: "oidc" | "token" | "dev" } | { ok: false; status: 401 | 503; reason: string };

export async function verifyPubSubPush(req: Request): Promise<PushAuth> {
  const audience = process.env.GMAIL_PUSH_AUDIENCE;
  const serviceAccount = process.env.GMAIL_PUSH_SERVICE_ACCOUNT;
  const token = process.env.GMAIL_PUSH_TOKEN;
  if (!audience && !token) {
    if (process.env.NODE_ENV === "production") return { ok: false, status: 503, reason: "Gmail push authentication not configured" };
    return { ok: true, via: "dev" };
  }
  if (token && safeEqual(new URL(req.url).searchParams.get("token"), token)) return { ok: true, via: "token" };
  const bearer = req.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (audience && bearer) {
    try {
      const { payload } = await jwtVerify(bearer, GOOGLE_JWKS, { issuer: ["https://accounts.google.com", "accounts.google.com"], audience });
      if (serviceAccount && (payload.email !== serviceAccount || payload.email_verified !== true)) return { ok: false, status: 401, reason: "wrong service account" };
      return { ok: true, via: "oidc" };
    } catch {
      return { ok: false, status: 401, reason: "invalid token" };
    }
  }
  return { ok: false, status: 401, reason: "missing credentials" };
}
