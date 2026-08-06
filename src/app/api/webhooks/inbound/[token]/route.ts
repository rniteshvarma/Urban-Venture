import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { applyFieldMapping } from '@/lib/inbound/field-mapping';
import { processInboundLead } from '@/lib/inbound/handler';

export const dynamic = 'force-dynamic';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    // 1. Find source by token
    const source = await prisma.inboundSource.findUnique({
      where: { webhookToken: token }
    });

    if (!source || !source.isActive) {
      return NextResponse.json({ error: 'Invalid or inactive webhook token' }, { status: 401 });
    }

    // 2. Parse raw body
    let raw: Record<string, any> = {};
    try {
      raw = await req.json();
    } catch {
      const textBody = await req.text();
      raw = { text: textBody };
    }

    // 3. Apply field mapping from source.fieldMapping
    const parsed = applyFieldMapping(raw, source.fieldMapping as Record<string, string> | null);

    // 4. Run inbound handler
    const result = await processInboundLead({
      sourceId: source.id,
      rawPayload: raw,
      parsedData: parsed
    });

    // 5. Portals expect 200 OK
    return NextResponse.json({
      status: 'ok',
      inboundStatus: result.status,
      leadId: result.leadId
    });
  } catch (error: any) {
    console.error('Error in portal webhook handler:', error);
    return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
  }
}
