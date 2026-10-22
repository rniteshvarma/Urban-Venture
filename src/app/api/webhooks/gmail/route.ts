import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { processInboundLead } from '@/lib/inbound/handler';
import { webhookToken } from '@/lib/security/tokens';
import { requireAdmin } from '@/lib/admin-auth';
import { verifyPubSubPush } from '@/lib/security/pubsub-auth';

export const dynamic = 'force-dynamic';

function shouldIgnoreEmail(from: string, subject: string): boolean {
  const fromLower = (from || '').toLowerCase();
  const subjLower = (subject || '').toLowerCase();

  const autoIgnorePrefixes = ['noreply@', 'no-reply@', 'notifications@', 'mailer-daemon@', 'bounce@'];
  if (autoIgnorePrefixes.some(p => fromLower.includes(p))) return true;

  // Skip self domain emails if configured
  const ownDomain = process.env.ADMIN_EMAIL_DOMAIN || 'propertytiger.com';
  if (fromLower.endsWith(`@${ownDomain}`)) return true;

  return false;
}

function parseFromHeader(fromStr: string): { name: string; email: string } {
  if (!fromStr) return { name: 'Email Sender', email: '' };
  
  const match = fromStr.match(/^(?:"?([^"<]*)"?\s*)?<?([^>]+)>?$/);
  if (match) {
    const name = match[1]?.trim() || match[2].split('@')[0];
    const email = match[2].trim().toLowerCase();
    return { name, email };
  }
  return { name: fromStr.split('@')[0], email: fromStr.trim().toLowerCase() };
}

/** The Gmail inbound source, created on first use. Its webhook token is random, never a fixed string. */
async function gmailSource() {
  const existing = await prisma.inboundSource.findFirst({ where: { type: 'GMAIL', isActive: true } });
  if (existing) return existing;
  return prisma.inboundSource.create({
    data: { name: 'Gmail Inbox', type: 'GMAIL', webhookToken: webhookToken('gmail'), defaultStatus: 'NEW', dedupeWindow: 24, isActive: true },
  });
}

/**
 * POST /api/webhooks/gmail
 *
 *  - Google Pub/Sub pushes (authenticated by verifyPubSubPush). A Gmail watch
 *    notification carries only the mailbox and a history id, never the email
 *    itself, so it is recorded and nothing else: a lead is created only from a
 *    payload that actually contains a sender and a message.
 *  - The admin setup page's "test" payload, which needs an admin session.
 */
export async function POST(req: Request) {
  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ status: 'bad_request' }, { status: 400 });
    }

    // Test lead from the admin setup UI: admins only.
    if (body?.isTestPayload) {
      const auth = await requireAdmin();
      if (!auth.ok) return auth.res;
      if (!body?.senderEmail) return NextResponse.json({ status: 'bad_request' }, { status: 400 });
      const source = await gmailSource();
      const result = await processInboundLead({
        sourceId: source.id,
        rawPayload: body,
        parsedData: {
          name: body.senderName || 'Email Contact',
          email: body.senderEmail,
          phone: body.phone,
          message: `Subject: ${body.subject || 'Property Enquiry'}\n\n${body.emailBody || 'Interested in properties'}`,
          sourceMessageId: `test-${Date.now()}`,
        },
      });
      return NextResponse.json({ status: 'ok', testResult: result.status, leadId: result.leadId });
    }

    const auth = await verifyPubSubPush(req);
    if (!auth.ok) {
      console.warn(`[gmail webhook] rejected: ${auth.reason}`);
      return NextResponse.json({ status: 'unauthorized' }, { status: auth.status });
    }

    // Google Pub/Sub push format: { message: { data: "base64EncodedJson", messageId } }
    let emailAddress: string | null = null;
    let historyId: string | null = null;
    if (body?.message?.data) {
      try {
        const decoded = JSON.parse(Buffer.from(body.message.data, 'base64').toString('utf-8'));
        emailAddress = typeof decoded.emailAddress === 'string' ? decoded.emailAddress : null;
        historyId = decoded.historyId != null ? String(decoded.historyId) : null;
      } catch (e) {
        console.warn('Could not decode PubSub message data:', e);
      }
    }

    if (emailAddress && historyId) {
      await prisma.gmailWatchConfig.upsert({
        where: { gmailAddress: emailAddress },
        update: { lastEmailAt: new Date(), historyId },
        create: { gmailAddress: emailAddress, historyId, isActive: true, lastEmailAt: new Date() },
      });
    }

    // A message forwarded with its content (sender + body) becomes a lead.
    // Nothing is ever filled in with sample text.
    const fromStr = typeof body.from === 'string' ? body.from : '';
    const emailBodyText = typeof body.body === 'string' ? body.body : '';
    const subject = typeof body.subject === 'string' ? body.subject : 'Property enquiry';
    if (fromStr && emailBodyText && !shouldIgnoreEmail(fromStr, subject)) {
      const { name, email } = parseFromHeader(fromStr);
      const source = await gmailSource();
      await processInboundLead({
        sourceId: source.id,
        rawPayload: body,
        parsedData: { name, email, message: `Subject: ${subject}\n\n${emailBodyText}`, sourceMessageId: body.messageId || `gmail-${Date.now()}` },
      });
      return NextResponse.json({ status: 'ok', lead: true });
    }

    return NextResponse.json({ status: 'ok', recorded: !!emailAddress });
  } catch (error: any) {
    console.error('Error in Gmail webhook handler:', error);
    return NextResponse.json({ status: 'error' }, { status: 500 });
  }
}
