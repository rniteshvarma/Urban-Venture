/** GET /api/auth/verify-email?token= — confirm an email, then redirect to login. */
import { NextResponse, type NextRequest } from 'next/server';
import { verifyEmailToken } from '@/lib/email/verification';

export async function GET(req: NextRequest) {
  const base = process.env.NEXTAUTH_URL || req.nextUrl.origin;
  const token = req.nextUrl.searchParams.get('token');
  if (!token) return NextResponse.redirect(`${base}/login?verify=missing`);

  const res = await verifyEmailToken(token);
  return NextResponse.redirect(`${base}/login?verify=${res.ok ? 'success' : res.reason}`);
}
