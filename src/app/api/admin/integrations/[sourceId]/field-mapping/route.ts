import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ sourceId: string }> }
) {
  try {
    const { sourceId } = await params;
    const source = await prisma.inboundSource.findUnique({
      where: { id: sourceId },
      select: { id: true, name: true, fieldMapping: true }
    });

    if (!source) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    }

    // Also fetch the last received log to get sample raw fields
    const lastLog = await prisma.inboundLog.findFirst({
      where: { sourceId },
      orderBy: { receivedAt: 'desc' }
    });

    return NextResponse.json({
      fieldMapping: source.fieldMapping || {},
      sampleRawPayload: lastLog ? lastLog.rawPayload : null
    });
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
    const { fieldMapping } = body;

    const source = await prisma.inboundSource.update({
      where: { id: sourceId },
      data: {
        fieldMapping: fieldMapping || {}
      }
    });

    return NextResponse.json({ source });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
