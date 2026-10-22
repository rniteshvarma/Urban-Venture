import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { EmailStatus } from "@prisma/client";
import { verifySvix } from "@/lib/security/svix";

export async function POST(req: Request) {
  try {
    // Only Resend may report delivery events: verify its (Svix) signature on the raw body.
    const raw = await req.text();
    const secret = process.env.RESEND_WEBHOOK_SECRET;
    if (!secret) {
      if (process.env.NODE_ENV === "production") return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
    } else if (!verifySvix(secret, req.headers, raw)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
    const body = (() => {
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    })();
    if (!body || !body.type || !body.data || !body.data.email_id) {
      return NextResponse.json({ error: "Invalid webhook payload" }, { status: 400 });
    }

    const eventType = body.type;
    const emailId = body.data.email_id;

    // Map Resend events to EmailStatus enum
    let status: EmailStatus | null = null;
    switch (eventType) {
      case "email.sent":
        status = EmailStatus.SENT;
        break;
      case "email.delivered":
        status = EmailStatus.DELIVERED;
        break;
      case "email.opened":
        status = EmailStatus.OPENED;
        break;
      case "email.clicked":
        status = EmailStatus.CLICKED;
        break;
      case "email.failed":
        status = EmailStatus.FAILED;
        break;
      case "email.bounced":
        status = EmailStatus.BOUNCED;
        break;
      default:
        break;
    }

    if (status) {
      // Find the BroadcastRecipient with emailMessageId equal to emailId
      const recipient = await prisma.broadcastRecipient.findFirst({
        where: { emailMessageId: emailId },
      });

      if (recipient) {
        await prisma.broadcastRecipient.update({
          where: { id: recipient.id },
          data: {
            emailStatus: status,
            emailSentAt: eventType === "email.sent" ? new Date() : undefined,
          },
        });
        console.log(`[Resend Webhook] Updated recipient ${recipient.id} status to ${status}`);
      } else {
        console.warn(`[Resend Webhook] No matching recipient found for emailMessageId: ${emailId}`);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error in Resend webhook route:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
