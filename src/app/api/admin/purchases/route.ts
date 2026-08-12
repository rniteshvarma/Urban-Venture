import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { calculateAppreciation } from '@/lib/appreciation-engine';

export const dynamic = 'force-dynamic';

// GET /api/admin/purchases — List all purchases
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const projectId = searchParams.get('projectId');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const where: any = {};
    if (userId) where.userId = userId;
    if (projectId) where.projectId = projectId;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { project: { name: { contains: search, mode: 'insensitive' } } },
        { unitNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    const purchases = await prisma.propertyPurchase.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        project: { select: { id: true, name: true, corridor: true, city: true, imageUrls: true } },
        lead: { select: { id: true, name: true, status: true } },
        _count: { select: { documents: true, installments: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate appreciation for each purchase
    const purchasesWithAppreciation = await Promise.all(
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

    // Compute summary stats
    const totalPurchases = purchases.length;
    const totalPortfolioValue = purchasesWithAppreciation.reduce(
      (sum, p) => sum + (p.appreciation?.currentEstimatedValue || p.purchasePrice), 0
    );
    const totalInvested = purchases.reduce((sum, p) => sum + p.purchasePrice, 0);
    const avgAppreciation = purchasesWithAppreciation.reduce(
      (sum, p) => sum + (p.appreciation?.appreciationPct || 0), 0
    ) / (totalPurchases || 1);

    return NextResponse.json({
      purchases: purchasesWithAppreciation,
      stats: {
        totalPurchases,
        totalPortfolioValue: Math.round(totalPortfolioValue),
        totalInvested: Math.round(totalInvested),
        avgAppreciation: Math.round(avgAppreciation * 100) / 100,
      },
    });
  } catch (error: any) {
    console.error('Error fetching purchases:', error);
    return NextResponse.json({ error: 'Failed to fetch purchases', details: error.message }, { status: 500 });
  }
}

// POST /api/admin/purchases — Create a new purchase
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      userId, leadId, projectId, unitNumber,
      areaSqYd, areaSqFt, purchasePrice,
      purchaseDate, registrationDate, possessionDate,
      loanAmount, loanBank, stampDutyPaid, registrationFee,
      status, notes,
    } = body;

    // Validate required fields
    if (!userId || !projectId || !purchasePrice || !purchaseDate) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, projectId, purchasePrice, purchaseDate' },
        { status: 400 }
      );
    }

    // Auto-derive per-unit prices
    const pricePerSqYd = areaSqYd ? purchasePrice / areaSqYd : null;
    const pricePerSqFt = areaSqFt ? purchasePrice / areaSqFt : null;

    const purchase = await prisma.propertyPurchase.create({
      data: {
        userId,
        leadId: leadId || null,
        projectId,
        unitNumber: unitNumber || null,
        areaSqYd: areaSqYd ? parseFloat(areaSqYd) : null,
        areaSqFt: areaSqFt ? parseFloat(areaSqFt) : null,
        purchasePrice: parseFloat(purchasePrice),
        pricePerSqYd,
        pricePerSqFt,
        purchaseDate: new Date(purchaseDate),
        registrationDate: registrationDate ? new Date(registrationDate) : null,
        possessionDate: possessionDate ? new Date(possessionDate) : null,
        loanAmount: loanAmount ? parseFloat(loanAmount) : null,
        loanBank: loanBank || null,
        stampDutyPaid: stampDutyPaid ? parseFloat(stampDutyPaid) : null,
        registrationFee: registrationFee ? parseFloat(registrationFee) : null,
        status: status || 'BOOKING_RECEIVED',
        notes: notes || null,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true, corridor: true } },
        lead: { select: { id: true, name: true } },
      },
    });

    // Optionally mark lead as CONVERTED
    if (leadId) {
      await prisma.lead.update({
        where: { id: leadId },
        data: { status: 'CONVERTED' },
      }).catch(() => {}); // Non-critical
    }

    return NextResponse.json(purchase, { status: 201 });
  } catch (error: any) {
    console.error('Error creating purchase:', error);
    return NextResponse.json({ error: 'Failed to create purchase', details: error.message }, { status: 500 });
  }
}
