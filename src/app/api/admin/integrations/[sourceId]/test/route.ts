import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { applyFieldMapping } from '@/lib/inbound/field-mapping';
import { processInboundLead } from '@/lib/inbound/handler';
import { requireAdmin } from "@/lib/admin-auth";

export const dynamic = 'force-dynamic';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ sourceId: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.res;

  try {
    const { sourceId } = await params;
    const source = await prisma.inboundSource.findUnique({
      where: { id: sourceId }
    });

    if (!source) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    }

    const body = await req.json();
    const testPayload = body.testPayload || body;

    // Apply mapping
    const parsed = applyFieldMapping(testPayload, source.fieldMapping as any);

    // Process test payload
    const result = await processInboundLead({
      sourceId: source.id,
      rawPayload: testPayload,
      parsedData: parsed
    });

    return NextResponse.json({
      status: 'ok',
      testStatus: result.status,
      leadId: result.leadId,
      parsedData: parsed
    });
  } catch (error: any) {
    console.error('Error running test payload:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
