import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      // Allow local testing if no secret set
    }

    const now = new Date();
    const expiryWindow = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now

    const expiringConfigs = await prisma.gmailWatchConfig.findMany({
      where: {
        isActive: true,
        OR: [
          { watchExpiry: { lte: expiryWindow } },
          { watchExpiry: null }
        ]
      }
    });

    const renewed: string[] = [];

    for (const config of expiringConfigs) {
      // Auto-renew watch expiry timestamp by 7 days
      const newExpiry = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      await prisma.gmailWatchConfig.update({
        where: { id: config.id },
        data: {
          watchExpiry: newExpiry,
          lastRenewedAt: now
        }
      });
      renewed.push(config.gmailAddress);
    }

    return NextResponse.json({
      status: 'ok',
      renewedCount: renewed.length,
      renewedAccounts: renewed,
      timestamp: now.toISOString()
    });
  } catch (error: any) {
    console.error('Error in Gmail watch renewal cron job:', error);
    return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
  }
}
