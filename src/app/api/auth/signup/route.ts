import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { resolveLeadIdentity } from "@/lib/lead-resolution";
import { refreshProfileScore } from "@/lib/profile-score";
import { createAndSendVerification } from "@/lib/email/verification";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[6-9]\d{9}$/;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name: string = (body.name || "").trim();
    const email: string = (body.email || "").toLowerCase().trim();
    const password: string = body.password || "";
    const phone10 = (body.phone || "").replace(/\D/g, "").slice(-10);

    if (!EMAIL_RE.test(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    if (password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    if (!PHONE_RE.test(phone10)) return NextResponse.json({ error: "Enter a valid Indian mobile number." }, { status: 400 });
    const e164 = "+91" + phone10;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing?.password) {
      return NextResponse.json({ error: "An account with this email already exists. Sign in instead.", code: "EXISTS" }, { status: 409 });
    }
    if (existing?.googleId && !existing.password) {
      return NextResponse.json({ error: "This email is registered with Google. Continue with Google.", code: "USE_GOOGLE" }, { status: 409 });
    }

    // App-level phone uniqueness (we dropped the DB unique constraint).
    const dupPhone = await prisma.user.findFirst({ where: { phone: e164, NOT: existing ? { id: existing.id } : undefined } });
    if (dupPhone) return NextResponse.json({ error: "This mobile number is already registered." }, { status: 409 });

    const passwordHash = await bcrypt.hash(password, 12);

    const user = existing
      ? await prisma.user.update({
          where: { id: existing.id },
          data: { name: name || existing.name, password: passwordHash, phone: e164, authProvider: existing.googleId ? "BOTH" : "EMAIL" },
        })
      : await prisma.user.create({
          data: { name: name || "Client", email, password: passwordHash, phone: e164, role: "CLIENT", authProvider: "EMAIL", phoneVerified: false },
        });

    // Link to existing CRM lead(s) or create a portal lead (fires automations).
    await resolveLeadIdentity(user).catch((e) => console.error("signup: resolveLeadIdentity:", e));
    await refreshProfileScore(user.id).catch(() => {});

    // Send the email-verification link (fire-and-forget — never blocks signup).
    createAndSendVerification(user).catch((e) => console.error("signup: verification email:", e));

    // Client then calls signIn("credentials") + POST /api/auth/merge-anonymous.
    return NextResponse.json({ success: true, userId: user.id });
  } catch (e: any) {
    console.error("POST /api/auth/signup:", e);
    return NextResponse.json({ error: "Could not create account. Please try again." }, { status: 500 });
  }
}
