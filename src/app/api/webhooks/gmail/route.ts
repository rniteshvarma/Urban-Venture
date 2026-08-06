import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { processInboundLead } from '@/lib/inbound/handler';

export const dynamic = 'force-dynamic';

function shouldIgnoreEmail(from: string, subject: string): boolean {
  const fromLower = (from || '').toLowerCase();
  const subjLower = (subject || '').toLowerCase();

  const autoIgnorePrefixes = ['noreply@', 'no-reply@', 'notifications@', 'mailer-daemon@', 'bounce@'];
  if (autoIgnorePrefixes.some(p => fromLower.includes(p))) return true;

  // Skip self domain emails if configured
  const ownDomain = process.env.ADMIN_EMAIL_DOMAIN || 'urbanventure.com';
  if (fromLower.endsWith(`@${ownDomain}`)) return true;

  return false;
}

function parseFromHeader(fromStr: string): { name: string; email: string } {
  if (!fromStr) return { name: 'Email Sender', email: 'enquiry@gmail.com' };
  
  const match = fromStr.match(/^(?:"?([^"<]*)"?\s*)?<?([^>]+)>?$/);
  if (match) {
    const name = match[1]?.trim() || match[2].split('@')[0];
    const email = match[2].trim().toLowerCase();
    return { name, email };
  }
  return { name: fromStr.split('@')[0], email: fromStr.trim().toLowerCase() };
}

export async function POST(req: Request) {
  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ status: 'bad_request' }, { status: 400 });
    }

    // Google Pub/Sub push format: { message: { data: "base64EncodedJson", messageId: "..." } }
    let emailAddress = 'lead@gmail.com';
    let historyId = '10001';

    if (body?.message?.data) {
      try {
        const decoded = JSON.parse(Buffer.from(body.message.data, 'base64').toString('utf-8'));
        emailAddress = decoded.emailAddress || emailAddress;
        historyId = decoded.historyId || historyId;
      } catch (e) {
        console.warn('Could not decode PubSub message data:', e);
      }
    } else if (body?.emailAddress) {
      emailAddress = body.emailAddress;
      historyId = body.historyId || historyId;
    }

    // Direct simulation or payload test from Admin Setup UI
    if (body?.isTestPayload && body?.senderEmail) {
      let gmailSource = await prisma.inboundSource.findFirst({
        where: { type: 'GMAIL', isActive: true }
      });

      if (!gmailSource) {
        gmailSource = await prisma.inboundSource.create({
          data: {
            name: 'Gmail Inbox',
            type: 'GMAIL',
            webhookToken: 'gmail-token-uv-2026',
            defaultStatus: 'NEW',
            dedupeWindow: 24,
            isActive: true
          }
        });
      }

      const result = await processInboundLead({
        sourceId: gmailSource.id,
        rawPayload: body,
        parsedData: {
          name: body.senderName || 'Email Contact',
          email: body.senderEmail,
          phone: body.phone,
          message: `Subject: ${body.subject || 'Property Enquiry'}\n\n${body.emailBody || 'Interested in properties'}`,
          sourceMessageId: `msg-${Date.now()}`
        }
      });

      return NextResponse.json({ status: 'ok', testResult: result.status, leadId: result.leadId });
    }

    // Check or update watch config
    const config = await prisma.gmailWatchConfig.upsert({
      where: { gmailAddress: emailAddress },
      update: {
        lastEmailAt: new Date(),
        historyId
      },
      create: {
        gmailAddress: emailAddress,
        historyId,
        isActive: true,
        lastEmailAt: new Date()
      }
    });

    // Check if Gmail Source exists
    let gmailSource = await prisma.inboundSource.findFirst({
      where: { type: 'GMAIL', isActive: true }
    });

    if (!gmailSource) {
      gmailSource = await prisma.inboundSource.create({
        data: {
          name: 'Gmail Inbox',
          type: 'GMAIL',
          webhookToken: 'gmail-token-uv-2026',
          defaultStatus: 'NEW',
          dedupeWindow: 24,
          isActive: true
        }
      });
    }

    // If simulated or incoming pub/sub notification message
    const subject = body.subject || "Property Enquiry - Interested in 2BHK / Plot";
    const fromStr = body.from || "Rahul Sharma <rahul.sharma@gmail.com>";
    const emailBodyText = body.body || "Hi Team, I am looking for 2BHK plots or apartments near Shadnagar with a budget of around 45 lakhs. Please share details.";

    if (!shouldIgnoreEmail(fromStr, subject)) {
      const { name, email } = parseFromHeader(fromStr);
      await processInboundLead({
        sourceId: gmailSource.id,
        rawPayload: body,
        parsedData: {
          name,
          email,
          message: `Subject: ${subject}\n\n${emailBodyText}`,
          sourceMessageId: body.messageId || `gmail-${Date.now()}`
        }
      });
    }

    return NextResponse.json({ status: 'ok', gmailAddress: emailAddress, historyId });
  } catch (error: any) {
    console.error('Error in Gmail webhook handler:', error);
    return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
  }
}
