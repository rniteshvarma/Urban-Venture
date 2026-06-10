import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { WAStatus } from "@prisma/client";

// POST /api/admin/whatsapp/webhook - Receive status updates from WATI
export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("[WATI Webhook Received]", JSON.stringify(body, null, 2));

    // WATI webhook typically contains fields like:
    // { "id": "msg_id", "status": "delivered", "phone": "91...", "time": "..." }
    // or { "messageId": "msg_id", "statusString": "READ" }
    const waMessageId = body.messageId || body.id || body.waMessageId;
    const rawStatus = body.statusString || body.status;

    if (!waMessageId || !rawStatus) {
      return NextResponse.json({ success: false, error: "Missing message ID or status" }, { status: 400 });
    }

    // Convert status to WAStatus enum
    let status: WAStatus | null = null;
    const statusUpper = String(rawStatus).toUpperCase();

    if (statusUpper.includes("READ")) {
      status = WAStatus.READ;
    } else if (statusUpper.includes("DELIVERED")) {
      status = WAStatus.DELIVERED;
    } else if (statusUpper.includes("SENT")) {
      status = WAStatus.SENT;
    } else if (statusUpper.includes("FAILED")) {
      status = WAStatus.FAILED;
    }

    if (!status) {
      return NextResponse.json({ success: false, error: `Invalid status: ${rawStatus}` }, { status: 400 });
    }

    // Find the log record
    const log = await prisma.whatsAppLog.findFirst({
      where: { waMessageId }
    });

    if (!log) {
      console.log(`[WATI Webhook] WhatsAppLog not found for waMessageId: ${waMessageId}`);
      return NextResponse.json({ success: false, message: "Log not found" }, { status: 200 }); // Return 200 to WATI so it doesn't retry
    }

    // Update timestamps accordingly
    const updateData: any = { status };
    if (status === WAStatus.DELIVERED) {
      updateData.deliveredAt = new Date();
    } else if (status === WAStatus.READ) {
      updateData.readAt = new Date();
      // If read, also set delivered if not set
      if (!log.deliveredAt) {
        updateData.deliveredAt = new Date();
      }
    } else if (status === WAStatus.SENT) {
      updateData.sentAt = new Date();
    }

    await prisma.whatsAppLog.update({
      where: { id: log.id },
      data: updateData
    });

    return NextResponse.json({ success: true, message: `Status updated to ${status} for log ID ${log.id}` });
  } catch (error: any) {
    console.error("Error in POST /api/admin/whatsapp/webhook:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
