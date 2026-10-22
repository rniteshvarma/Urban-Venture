import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { issueOtp, canResend } from "@/lib/otp-store";
import { sendTemplateMessage } from "@/lib/whatsapp/send";

/**
 * Send a 6-digit OTP to the user's phone as a WhatsApp AUTHENTICATION
 * template (WA_OTP_TEMPLATE, default "signup_otp_v1": body {{1}} = code plus
 * the copy-code button). With no provider credentials the send is a dry run:
 * in development the code is returned so verification stays testable; in
 * production the request is refused (the code was never delivered).
 */
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { phone: true, phoneVerified: true } });
  if (!user?.phone) return NextResponse.json({ error: "Add a mobile number first." }, { status: 400 });
  if (user.phoneVerified) return NextResponse.json({ success: true, alreadyVerified: true });
  if (!(await canResend(session.user.id))) return NextResponse.json({ error: "Please wait before requesting another code." }, { status: 429 });

  const code = await issueOtp(session.user.id);
  const outcome = await sendTemplateMessage({
    to: user.phone,
    templateName: process.env.WA_OTP_TEMPLATE || "signup_otp_v1",
    languageCode: process.env.WA_OTP_LANGUAGE || "en",
    bodyParams: [code],
    buttonParams: [{ subType: "url", index: 0, value: code }],
    category: "AUTHENTICATION",
    feature: "otp",
    contextId: `otp:${session.user.id}:${code}`,
    userId: session.user.id,
    previewText: "Verification code sent",
  });

  if (outcome.dryRun) {
    // No WhatsApp provider: the code never reached the phone. Handing it back
    // would let anyone "verify" any number, so that only happens in development.
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Phone verification isn't available yet. You can skip it for now.", code: "OTP_UNAVAILABLE" }, { status: 503 });
    }
    console.log(`[OTP • DRY RUN] code for ${user.phone}: ${code}`);
    return NextResponse.json({ success: true, devCode: code });
  }
  if (!outcome.ok) {
    console.error(`[OTP] WhatsApp send failed: ${outcome.errorCode} ${outcome.errorMessage}`);
    const message =
      outcome.errorCode === "INVALID_NUMBER" || outcome.errorCode === "NOT_OPTED_IN"
        ? "We couldn't reach that number on WhatsApp. Check it and try again."
        : "We couldn't send the code just now. Please try again in a minute.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
  return NextResponse.json({ success: true });
}
