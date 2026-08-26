/** POST /api/auth/verify-email/resend — resend the verification email (60s cooldown). */
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { createAndSendVerification } from '@/lib/email/verification';

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, name: true, emailVerified: true },
  });
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (user.emailVerified) return NextResponse.json({ success: true, alreadyVerified: true });

  const recent = await prisma.emailVerificationToken.findFirst({
    where: { userId: user.id, createdAt: { gt: new Date(Date.now() - 60_000) } },
  });
  if (recent) return NextResponse.json({ error: 'Please wait a minute before requesting another email.' }, { status: 429 });

  await createAndSendVerification(user);
  return NextResponse.json({ success: true });
}
