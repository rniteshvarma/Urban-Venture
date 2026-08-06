import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ sourceId: string }> }
) {
  try {
    const { sourceId } = await params;
    const source = await prisma.inboundSource.findUnique({
      where: { id: sourceId },
      include: {
        _count: { select: { logs: true } }
      }
    });

    if (!source) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    }

    return NextResponse.json({ source });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ sourceId: string }> }
) {
  try {
    const { sourceId } = await params;
    const body = await req.json();

    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.isActive !== undefined) updateData.isActive = Boolean(body.isActive);
    if (body.autoAssignTo !== undefined) updateData.autoAssignTo = body.autoAssignTo || null;
    if (body.defaultStatus !== undefined) updateData.defaultStatus = body.defaultStatus;
    if (body.dedupeWindow !== undefined) updateData.dedupeWindow = parseInt(body.dedupeWindow);
    if (body.fieldMapping !== undefined) updateData.fieldMapping = body.fieldMapping;

    if (body.regenerateToken) {
      const existing = await prisma.inboundSource.findUnique({ where: { id: sourceId } });
      const prefix = existing ? existing.name.toLowerCase().replace(/[^a-z0-9]/g, '') : 'token';
      updateData.webhookToken = `${prefix}-${crypto.randomBytes(8).toString('hex')}`;
    }

    const updatedSource = await prisma.inboundSource.update({
      where: { id: sourceId },
      data: updateData
    });

    return NextResponse.json({ source: updatedSource });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ sourceId: string }> }
) {
  try {
    const { sourceId } = await params;
    await prisma.inboundSource.delete({
      where: { id: sourceId }
    });
    return NextResponse.json({ status: 'deleted' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
