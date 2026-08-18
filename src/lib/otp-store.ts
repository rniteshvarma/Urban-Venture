/**
 * Phone-OTP store — DEV STUB.
 * In-memory only (single-process dev). Production must swap this for WATI
 * delivery + a persistent/short-TTL store (e.g. Redis). Kept isolated so the
 * routes don't change when WATI creds land.
 */
interface OtpEntry {
  code: string;
  expiresAt: number;
  lastSentAt: number;
}

const store = new Map<string, OtpEntry>();
const TTL_MS = 5 * 60 * 1000;
const RESEND_COOLDOWN_MS = 30 * 1000;

export const WATI_CONFIGURED = !!(process.env.WATI_API_KEY && process.env.WATI_API_ENDPOINT);

export function canResend(userId: string): boolean {
  const e = store.get(userId);
  return !e || Date.now() - e.lastSentAt >= RESEND_COOLDOWN_MS;
}

/** Generate + store an OTP. Returns the code (dev logs it; prod would send via WATI). */
export function issueOtp(userId: string): string {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  store.set(userId, { code, expiresAt: Date.now() + TTL_MS, lastSentAt: Date.now() });
  return code;
}

export function verifyOtp(userId: string, code: string): { ok: boolean; reason?: string } {
  const e = store.get(userId);
  if (!e) return { ok: false, reason: "No code requested. Tap resend." };
  if (Date.now() > e.expiresAt) {
    store.delete(userId);
    return { ok: false, reason: "Code expired. Tap resend." };
  }
  if (e.code !== code.trim()) return { ok: false, reason: "Incorrect code." };
  store.delete(userId);
  return { ok: true };
}
