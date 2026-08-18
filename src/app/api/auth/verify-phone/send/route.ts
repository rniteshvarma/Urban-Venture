import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { issueOtp, canResend, WATI_CONFIGURED } from "@/lib/otp-store";

/** Send a 6-digit OTP to the user's phone via WATI (stubbed until creds exist). */
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { phone: true, phoneVerified: true } });
  if (!user?.phone) return NextResponse.json({ error: "Add a mobile number first." }, { status: 400 });
  if (user.phoneVerified) return NextResponse.json({ success: true, alreadyVerified: true });
  if (!canResend(session.user.id)) return NextResponse.json({ error: "Please wait before requesting another code." }, { status: 429 });

  const code = issueOtp(session.user.id);

  if (WATI_CONFIGURED) {
    // TODO: send via WATI when creds are configured.
    console.log(`[OTP] would send ${code} to ${user.phone} via WATI`);
  } else {
    console.log(`[OTP • DEV STUB] code for ${user.phone}: ${code}`);
  }

  // In dev without WATI, surface the code so verification is testable end-to-end.
  return NextResponse.json({ success: true, devCode: WATI_CONFIGURED ? undefined : code });
}
