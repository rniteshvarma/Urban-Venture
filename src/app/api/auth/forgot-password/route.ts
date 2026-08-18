import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import prisma from "@/lib/prisma";

/**
 * Create a single-use, 1h password-reset token and email the link.
 * Always returns success (never reveal whether an email is registered).
 */
export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    const clean = (email || "").toLowerCase().trim();
    const user = clean ? await prisma.user.findUnique({ where: { email: clean } }) : null;

    if (user && user.password) {
      // invalidate prior unused tokens
      await prisma.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      });
      const token = randomBytes(32).toString("hex");
      await prisma.passwordResetToken.create({
        data: { token, userId: user.id, expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
      });

      const base = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
      const link = `${base}/reset-password/${token}`;

      // Send via Resend if configured; always log for dev.
      console.log(`[PASSWORD RESET] ${clean} → ${link}`);
      if (process.env.RESEND_API_KEY) {
        try {
          const { Resend } = await import("resend");
          const resend = new Resend(process.env.RESEND_API_KEY);
          await resend.emails.send({
            from: "Urban Ventures <onboarding@resend.dev>",
            to: clean,
            subject: "Reset your Urban Ventures password",
            html: `<p>Reset your password (link valid for 1 hour):</p><p><a href="${link}">${link}</a></p><p>If you didn't request this, ignore this email.</p>`,
          });
        } catch (e) {
          console.error("forgot-password: email send failed (link logged above):", e);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("POST /api/auth/forgot-password:", e);
    return NextResponse.json({ success: true }); // do not leak errors
  }
}
