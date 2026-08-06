import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { processInboundLead } from '@/lib/inbound/handler';
import { calculateLeadScore } from '@/lib/lead-scorer';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // WATI incoming payload structure:
    // { id, waId, senderName, text: { body }, type, eventType, timestamp }
    const type = body.type || body.eventType;
    const messageText = body.text?.body || body.message || body.data?.text || body.text;

    // Only process text or interactive user messages (ignore delivery receipts, status updates)
    if (type && type !== 'text' && type !== 'interactive' && type !== 'user_message') {
      return NextResponse.json({ status: 'ignored', reason: 'Non-text message type' });
    }

    const waId = body.waId || body.phone || body.from;
    if (!waId) {
      return NextResponse.json({ status: 'ignored', reason: 'No waId/phone found' });
    }

    const cleanPhone = String(waId).replace(/\D/g, '');
    const phoneShort = cleanPhone.slice(-10);

    // Check if this phone belongs to an existing lead
    const existingLead = await prisma.lead.findFirst({
      where: { phone: { contains: phoneShort } },
      orderBy: { createdAt: 'desc' }
    });

    if (existingLead) {
      // Known lead — append message to their timeline note without creating duplicate
      const timeStr = new Date().toLocaleString('en-IN');
      const updatedNotes = (existingLead.notes || '') + `\n[WhatsApp ${timeStr}] ${messageText || 'Incoming message'}`;
      
      await prisma.lead.update({
        where: { id: existingLead.id },
        data: {
          notes: updatedNotes,
          updatedAt: new Date()
        }
      });

      // Recalculate lead score to reflect recent activity
      calculateLeadScore(existingLead.id).catch(console.error);

      return NextResponse.json({ status: 'appended_to_existing', leadId: existingLead.id });
    }

    // New contact — find or create WhatsApp InboundSource
    let whatsappSource = await prisma.inboundSource.findFirst({
      where: { type: 'WHATSAPP', isActive: true }
    });

    if (!whatsappSource) {
      whatsappSource = await prisma.inboundSource.create({
        data: {
          name: 'WhatsApp Business',
          type: 'WHATSAPP',
          webhookToken: 'whatsapp-token-uv-2026',
          defaultStatus: 'NEW',
          dedupeWindow: 24,
          isActive: true
        }
      });
    }

    const result = await processInboundLead({
      sourceId: whatsappSource.id,
      rawPayload: body,
      parsedData: {
        name: body.senderName || body.name || 'WhatsApp Contact',
        phone: cleanPhone,
        message: messageText || 'WhatsApp Enquiry',
        sourceMessageId: body.id || body.messageId || `wa-${Date.now()}`
      }
    });

    return NextResponse.json({ status: 'ok', result: result.status, leadId: result.leadId });
  } catch (error: any) {
    console.error('Error in WhatsApp inbound webhook handler:', error);
    return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
  }
}
