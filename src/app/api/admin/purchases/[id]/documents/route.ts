import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET /api/admin/purchases/[id]/documents
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const documents = await prisma.propertyDocument.findMany({
      where: { purchaseId: id },
      orderBy: { uploadedAt: 'desc' },
    });

    return NextResponse.json(documents);
  } catch (error: any) {
    console.error('Error fetching documents:', error);
    return NextResponse.json({ error: 'Failed to fetch documents', details: error.message }, { status: 500 });
  }
}

// POST /api/admin/purchases/[id]/documents — Add a document
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { type, name, url } = body;

    if (!type || !name || !url) {
      return NextResponse.json({ error: 'Missing required fields: type, name, url' }, { status: 400 });
    }

    // Verify purchase exists
    const purchase = await prisma.propertyPurchase.findUnique({ where: { id } });
    if (!purchase) {
      return NextResponse.json({ error: 'Purchase not found' }, { status: 404 });
    }

    const document = await prisma.propertyDocument.create({
      data: { purchaseId: id, type, name, url },
    });

    return NextResponse.json(document, { status: 201 });
  } catch (error: any) {
    console.error('Error creating document:', error);
    return NextResponse.json({ error: 'Failed to create document', details: error.message }, { status: 500 });
  }
}

// DELETE /api/admin/purchases/[id]/documents — Delete a document by documentId query param
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const documentId = searchParams.get('documentId');

    if (!documentId) {
      return NextResponse.json({ error: 'Missing documentId query parameter' }, { status: 400 });
    }

    await prisma.propertyDocument.delete({ where: { id: documentId } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting document:', error);
    return NextResponse.json({ error: 'Failed to delete document', details: error.message }, { status: 500 });
  }
}
