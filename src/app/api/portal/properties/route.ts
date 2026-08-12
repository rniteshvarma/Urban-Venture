import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { calculateAppreciation } from '@/lib/appreciation-engine';

export const dynamic = 'force-dynamic';

// GET /api/portal/properties — List properties for authenticated CLIENT user
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const purchases = await prisma.propertyPurchase.findMany({
      where: { userId: session.user.id },
      include: {
        project: {
          select: {
            id: true, name: true, corridor: true, city: true,
            developer: true, imageUrls: true, propertyType: true,
          },
        },
        _count: { select: { documents: true, installments: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate appreciation for each
    const results = await Promise.all(
      purchases.map(async (purchase) => {
        try {
          const appreciation = await calculateAppreciation({
            purchasePrice: purchase.purchasePrice,
            purchaseDate: purchase.purchaseDate,
            pricePerSqYd: purchase.pricePerSqYd,
            pricePerSqFt: purchase.pricePerSqFt,
            areaSqYd: purchase.areaSqYd,
            areaSqFt: purchase.areaSqFt,
            project: purchase.project,
          });
          return { ...purchase, appreciation };
        } catch {
          return { ...purchase, appreciation: null };
        }
      })
    );

    // Portfolio summary
    const totalInvested = purchases.reduce((s, p) => s + p.purchasePrice, 0);
    const totalCurrentValue = results.reduce(
      (s, p) => s + (p.appreciation?.currentEstimatedValue || p.purchasePrice), 0
    );
    const totalGain = totalCurrentValue - totalInvested;
    const totalAppreciationPct = totalInvested > 0
      ? ((totalCurrentValue - totalInvested) / totalInvested) * 100
      : 0;

    return NextResponse.json({
      properties: results,
      portfolio: {
        totalInvested: Math.round(totalInvested),
        totalCurrentValue: Math.round(totalCurrentValue),
        totalGain: Math.round(totalGain),
        totalAppreciationPct: Math.round(totalAppreciationPct * 100) / 100,
        propertyCount: purchases.length,
      },
    });
  } catch (error: any) {
    console.error('Error fetching portal properties:', error);
    return NextResponse.json({ error: 'Failed to fetch properties', details: error.message }, { status: 500 });
  }
}
