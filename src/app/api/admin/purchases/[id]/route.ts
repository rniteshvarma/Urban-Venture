import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { calculateAppreciation } from '@/lib/appreciation-engine';

export const dynamic = 'force-dynamic';

// GET /api/admin/purchases/[id] — Single purchase detail
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const purchase = await prisma.propertyPurchase.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        project: { select: { id: true, name: true, corridor: true, city: true, developer: true, imageUrls: true, propertyType: true } },
        lead: { select: { id: true, name: true, status: true, phone: true } },
        documents: { orderBy: { uploadedAt: 'desc' } },
        installments: { orderBy: { dueDate: 'asc' } },
      },
    });

    if (!purchase) {
      return NextResponse.json({ error: 'Purchase not found' }, { status: 404 });
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

    return NextResponse.json({ ...purchase, appreciation });
  } catch (error: any) {
    console.error('Error fetching purchase:', error);
    return NextResponse.json({ error: 'Failed to fetch purchase', details: error.message }, { status: 500 });
  }
}

// PUT /api/admin/purchases/[id] — Update purchase
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    // Build update data, only including provided fields
    const updateData: any = {};
    const fields = [
      'unitNumber', 'areaSqYd', 'areaSqFt', 'purchasePrice',
      'purchaseDate', 'registrationDate', 'possessionDate',
      'loanAmount', 'loanBank', 'stampDutyPaid', 'registrationFee',
      'status', 'notes',
    ];

    for (const field of fields) {
      if (body[field] !== undefined) {
        if (['purchaseDate', 'registrationDate', 'possessionDate'].includes(field)) {
          updateData[field] = body[field] ? new Date(body[field]) : null;
        } else if (['areaSqYd', 'areaSqFt', 'purchasePrice', 'loanAmount', 'stampDutyPaid', 'registrationFee'].includes(field)) {
          updateData[field] = body[field] ? parseFloat(body[field]) : null;
        } else {
          updateData[field] = body[field];
        }
      }
    }

    // Re-derive per-unit prices if price or area changed
    const price = updateData.purchasePrice || body.existingPrice;
    if (updateData.areaSqYd && price) updateData.pricePerSqYd = price / updateData.areaSqYd;
    if (updateData.areaSqFt && price) updateData.pricePerSqFt = price / updateData.areaSqFt;

    const purchase = await prisma.propertyPurchase.update({
      where: { id },
      data: updateData,
      include: {
        user: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true, corridor: true } },
      },
    });

    return NextResponse.json(purchase);
  } catch (error: any) {
    console.error('Error updating purchase:', error);
    return NextResponse.json({ error: 'Failed to update purchase', details: error.message }, { status: 500 });
  }
}

// DELETE /api/admin/purchases/[id] — Delete purchase
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await prisma.propertyPurchase.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting purchase:', error);
    return NextResponse.json({ error: 'Failed to delete purchase', details: error.message }, { status: 500 });
  }
}
