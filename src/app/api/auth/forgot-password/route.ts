import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import prisma from "@/lib/prisma";
import { sendEmail } from "@/lib/email/client";
import { passwordResetEmail } from "@/lib/email/templates";

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

      // Send via the central email layer (mock-safe in dev, always logs the link).
      console.log(`[PASSWORD RESET] ${clean} → ${link}`);
      const tmpl = passwordResetEmail({ name: user.name, resetUrl: link });
      await sendEmail({ to: clean, subject: tmpl.subject, html: tmpl.html, text: tmpl.text, tags: { type: "password_reset" } });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("POST /api/auth/forgot-password:", e);
    return NextResponse.json({ success: true }); // do not leak errors
  }
}
