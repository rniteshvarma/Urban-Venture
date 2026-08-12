import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET /api/admin/purchases/[id]/installments
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const installments = await prisma.paymentInstallment.findMany({
      where: { purchaseId: id },
      orderBy: { dueDate: 'asc' },
    });

    return NextResponse.json(installments);
  } catch (error: any) {
    console.error('Error fetching installments:', error);
    return NextResponse.json({ error: 'Failed to fetch installments', details: error.message }, { status: 500 });
  }
}

// POST /api/admin/purchases/[id]/installments — Add an installment
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { label, amount, dueDate, paidDate, status, receiptUrl } = body;

    if (!label || !amount || !dueDate) {
      return NextResponse.json({ error: 'Missing required fields: label, amount, dueDate' }, { status: 400 });
    }

    const installment = await prisma.paymentInstallment.create({
      data: {
        purchaseId: id,
        label,
        amount: parseFloat(amount),
        dueDate: new Date(dueDate),
        paidDate: paidDate ? new Date(paidDate) : null,
        status: status || 'PENDING',
        receiptUrl: receiptUrl || null,
      },
    });

    return NextResponse.json(installment, { status: 201 });
  } catch (error: any) {
    console.error('Error creating installment:', error);
    return NextResponse.json({ error: 'Failed to create installment', details: error.message }, { status: 500 });
  }
}

// PUT /api/admin/purchases/[id]/installments — Update an installment
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { installmentId, status, paidDate, receiptUrl } = body;

    if (!installmentId) {
      return NextResponse.json({ error: 'Missing installmentId' }, { status: 400 });
    }

    const installment = await prisma.paymentInstallment.update({
      where: { id: installmentId },
      data: {
        ...(status && { status }),
        ...(paidDate !== undefined && { paidDate: paidDate ? new Date(paidDate) : null }),
        ...(receiptUrl !== undefined && { receiptUrl }),
      },
    });

    return NextResponse.json(installment);
  } catch (error: any) {
    console.error('Error updating installment:', error);
    return NextResponse.json({ error: 'Failed to update installment', details: error.message }, { status: 500 });
  }
}
