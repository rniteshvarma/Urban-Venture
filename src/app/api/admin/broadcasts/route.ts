import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { processBroadcastSend } from "@/lib/broadcast-worker";
import { BroadcastChannel, GroupType, BroadcastStatus } from "@prisma/client";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "10");
    const page = parseInt(searchParams.get("page") || "1");
    const skip = (page - 1) * limit;

    const broadcasts = await prisma.broadcast.findMany({
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        recipients: {
          select: {
            id: true,
            whatsappStatus: true,
            emailStatus: true,
          }
        }
      }
    });

    const total = await prisma.broadcast.count();

    // Map stats dynamically
    const formattedBroadcasts = broadcasts.map((b) => {
      const totalRecipients = b.recipients.length;
      const waDelivered = b.recipients.filter(r => r.whatsappStatus === "SENT" || r.whatsappStatus === "DELIVERED" || r.whatsappStatus === "READ").length;
      const emailOpened = b.recipients.filter(r => r.emailStatus === "OPENED" || r.emailStatus === "CLICKED").length;

      return {
        id: b.id,
        name: b.name,
        channel: b.channel,
        groupType: b.groupType,
        recipientCount: b.recipientCount || totalRecipients,
        status: b.status,
        scheduledAt: b.scheduledAt,
        sentAt: b.sentAt,
        createdAt: b.createdAt,
        stats: {
          waDeliveredRate: totalRecipients > 0 ? Math.round((waDelivered / totalRecipients) * 100) : 0,
          emailOpenRate: totalRecipients > 0 ? Math.round((emailOpened / totalRecipients) * 100) : 0,
        }
      };
    });

    return NextResponse.json({
      success: true,
      broadcasts: formattedBroadcasts,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    console.error("Error in GET /api/admin/broadcasts:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      name,
      channel,
      templateId,
      emailSubject,
      emailBody,
      whatsappMessage,
      groupType,
      groupFilters,
      leadsList, // Array of lead objects { id: string }
      scheduledAt
    } = body;

    if (!name || !channel || !groupType || !leadsList || leadsList.length === 0) {
      return NextResponse.json({ error: "Missing required fields or empty recipient list" }, { status: 400 });
    }

    const initialStatus = scheduledAt ? BroadcastStatus.SCHEDULED : BroadcastStatus.DRAFT;

    // Create Broadcast record
    const broadcast = await prisma.broadcast.create({
      data: {
        name,
        channel: channel as BroadcastChannel,
        templateId,
        emailSubject,
        emailBody,
        whatsappMessage,
        groupType: groupType as GroupType,
        groupFilters: groupFilters || {},
        recipientCount: leadsList.length,
        status: initialStatus,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        createdBy: session.user.name || session.user.email || "Admin",
      }
    });

    // Bulk create recipients
    await prisma.broadcastRecipient.createMany({
      data: leadsList.map((lead: any) => ({
        broadcastId: broadcast.id,
        leadId: lead.id,
        whatsappStatus: channel === "WHATSAPP" || channel === "BOTH" ? "PENDING" : null,
        emailStatus: channel === "EMAIL" || channel === "BOTH" ? "PENDING" : null,
      }))
    });

    // Trigger sending immediately if not scheduled
    if (!scheduledAt) {
      await processBroadcastSend(broadcast.id).catch((err) => {
        console.error(`[Background Send Trigger Error] Broadcast ${broadcast.id}:`, err);
      });
    }

    return NextResponse.json({ success: true, broadcastId: broadcast.id });
  } catch (error: any) {
    console.error("Error in POST /api/admin/broadcasts:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
