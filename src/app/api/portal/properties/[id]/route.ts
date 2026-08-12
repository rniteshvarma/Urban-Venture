import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { calculateAppreciation } from '@/lib/appreciation-engine';

export const dynamic = 'force-dynamic';

// GET /api/portal/properties/[id] — Single property detail for client
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const purchase = await prisma.propertyPurchase.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            id: true, name: true, corridor: true, city: true,
            developer: true, imageUrls: true, propertyType: true,
            description: true, infraHighlights: true,
          },
        },
        documents: {
          select: { id: true, type: true, name: true, url: true, uploadedAt: true },
          orderBy: { uploadedAt: 'desc' },
        },
        installments: {
          orderBy: { dueDate: 'asc' },
        },
      },
    });

    if (!purchase) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    // Verify ownership
    if (purchase.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Calculate appreciation
    let appreciation = null;
    try {
      appreciation = await calculateAppreciation({
        purchasePrice: purchase.purchasePrice,
        purchaseDate: purchase.purchaseDate,
        pricePerSqYd: purchase.pricePerSqYd,
        pricePerSqFt: purchase.pricePerSqFt,
        areaSqYd: purchase.areaSqYd,
        areaSqFt: purchase.areaSqFt,
        project: purchase.project,
      });
    } catch (e) {
      console.warn('Appreciation calculation failed:', e);
    }

    // Payment summary
    const totalDue = purchase.installments.reduce((s, i) => s + i.amount, 0);
    const totalPaid = purchase.installments
      .filter(i => i.status === 'PAID')
      .reduce((s, i) => s + i.amount, 0);
    const overdueCount = purchase.installments.filter(i => i.status === 'OVERDUE').length;

    return NextResponse.json({
      ...purchase,
      appreciation,
      paymentSummary: {
        totalDue: Math.round(totalDue),
        totalPaid: Math.round(totalPaid),
        remaining: Math.round(totalDue - totalPaid),
        overdueCount,
      },
    });
  } catch (error: any) {
    console.error('Error fetching portal property:', error);
    return NextResponse.json({ error: 'Failed to fetch property', details: error.message }, { status: 500 });
  }
}
