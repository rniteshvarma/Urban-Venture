/**
 * Phone-OTP store — DB-backed.
 *
 * Previously an in-memory Map, which silently fails on serverless: `issueOtp`
 * and `verifyOtp` can run on different lambda instances, so the code issued in
 * one request isn't found in the next. Now it lives in the PhoneOtp table.
 *
 * The code is hashed at rest; attempts are capped to blunt brute force.
 * Delivery goes through the WhatsApp provider layer (see the send route).
 */
import { createHash } from "node:crypto";
import prisma from "./prisma";

const TTL_MS = 5 * 60 * 1000;
const RESEND_COOLDOWN_MS = 30 * 1000;
const MAX_ATTEMPTS = 5;

const hash = (code: string) => createHash("sha256").update(code.trim()).digest("hex");

export async function canResend(userId: string): Promise<boolean> {
  const e = await prisma.phoneOtp.findUnique({ where: { userId }, select: { lastSentAt: true } });
  return !e || Date.now() - e.lastSentAt.getTime() >= RESEND_COOLDOWN_MS;
}

/** Generate + store a fresh OTP (replacing any prior one). Returns the code. */
export async function issueOtp(userId: string): Promise<string> {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const data = { codeHash: hash(code), expiresAt: new Date(Date.now() + TTL_MS), lastSentAt: new Date(), attempts: 0 };
  await prisma.phoneOtp.upsert({ where: { userId }, create: { userId, ...data }, update: data });
  return code;
}

export async function verifyOtp(userId: string, code: string): Promise<{ ok: boolean; reason?: string }> {
  const e = await prisma.phoneOtp.findUnique({ where: { userId } });
  if (!e) return { ok: false, reason: "No code requested. Tap resend." };
  if (Date.now() > e.expiresAt.getTime()) {
    await prisma.phoneOtp.delete({ where: { userId } }).catch(() => {});
    return { ok: false, reason: "Code expired. Tap resend." };
  }
  if (e.attempts >= MAX_ATTEMPTS) {
    await prisma.phoneOtp.delete({ where: { userId } }).catch(() => {});
    return { ok: false, reason: "Too many attempts. Tap resend for a new code." };
  }
  if (e.codeHash !== hash(code)) {
    await prisma.phoneOtp.update({ where: { userId }, data: { attempts: { increment: 1 } } }).catch(() => {});
    return { ok: false, reason: "Incorrect code." };
  }
  await prisma.phoneOtp.delete({ where: { userId } }).catch(() => {});
  return { ok: true };
}
