/**
 * Email verification helper. 24h single-use token; sets User.emailVerified on
 * confirm. Used by signup and the resend endpoint.
 */

import { randomBytes } from 'crypto';
import prisma from '../prisma';
import { sendEmail } from './client';
import { verificationEmail } from './templates';

const EXPIRY_MS = 24 * 60 * 60 * 1000;

export async function createAndSendVerification(user: { id: string; email: string; name?: string | null }) {
  // Invalidate any prior unused tokens for this user.
  await prisma.emailVerificationToken.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() },
  });

  const token = randomBytes(32).toString('hex');
  await prisma.emailVerificationToken.create({
    data: { token, userId: user.id, expiresAt: new Date(Date.now() + EXPIRY_MS) },
  });

  const base = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const verifyUrl = `${base}/api/auth/verify-email?token=${token}`;
  console.log(`[EMAIL VERIFY] ${user.email} → ${verifyUrl}`); // always logged for dev

  const tmpl = verificationEmail({ name: user.name, verifyUrl });
  return sendEmail({ to: user.email, subject: tmpl.subject, html: tmpl.html, text: tmpl.text, tags: { type: 'verification' } });
}

export async function verifyEmailToken(token: string): Promise<{ ok: boolean; reason?: string }> {
  const row = await prisma.emailVerificationToken.findUnique({ where: { token } });
  if (!row) return { ok: false, reason: 'invalid' };
  if (row.usedAt) return { ok: false, reason: 'used' };
  if (row.expiresAt < new Date()) return { ok: false, reason: 'expired' };

  await prisma.$transaction([
    prisma.user.update({ where: { id: row.userId }, data: { emailVerified: new Date() } }),
    prisma.emailVerificationToken.update({ where: { id: row.id }, data: { usedAt: new Date() } }),
  ]);
  return { ok: true };
}
