import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { verifyOtp } from "@/lib/otp-store";
import { refreshProfileScore } from "@/lib/profile-score";

/** Confirm the OTP and mark the phone verified. */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { code } = await req.json();
  if (!code) return NextResponse.json({ error: "Enter the code." }, { status: 400 });

  const result = verifyOtp(session.user.id, String(code));
  if (!result.ok) return NextResponse.json({ error: result.reason }, { status: 400 });

  await prisma.user.update({ where: { id: session.user.id }, data: { phoneVerified: true } });
  await refreshProfileScore(session.user.id).catch(() => {});

  return NextResponse.json({ success: true });
}
