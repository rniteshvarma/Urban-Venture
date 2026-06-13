import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { EmailStatus } from "@prisma/client";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
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
