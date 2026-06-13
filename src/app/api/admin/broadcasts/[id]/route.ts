import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const broadcast = await prisma.broadcast.findUnique({
      where: { id },
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

    if (!broadcast) {
      return NextResponse.json({ error: "Broadcast not found" }, { status: 404 });
    }

    const recipients = broadcast.recipients;
    const totalCount = recipients.length;

    // WhatsApp stats breakdown
    const waSent = recipients.filter(r => r.whatsappStatus === "SENT").length;
    const waDelivered = recipients.filter(r => r.whatsappStatus === "DELIVERED").length;
    const waRead = recipients.filter(r => r.whatsappStatus === "READ").length;
    const waFailed = recipients.filter(r => r.whatsappStatus === "FAILED").length;

    // Email stats breakdown
    const emailSent = recipients.filter(r => r.emailStatus === "SENT").length;
    const emailDelivered = recipients.filter(r => r.emailStatus === "DELIVERED").length;
    const emailOpened = recipients.filter(r => r.emailStatus === "OPENED").length;
    const emailClicked = recipients.filter(r => r.emailStatus === "CLICKED").length;
    const emailFailed = recipients.filter(r => r.emailStatus === "FAILED").length;
    const emailBounced = recipients.filter(r => r.emailStatus === "BOUNCED").length;

    // Overall aggregate stats
    const waDeliveredCount = waDelivered + waRead;
    const emailOpenedCount = emailOpened + emailClicked;
    const totalFailed = waFailed + emailFailed + emailBounced;

    const stats = {
      totalRecipients: totalCount,
      whatsapp: {
        sent: waSent,
        delivered: waDeliveredCount,
        read: waRead,
        failed: waFailed,
        deliveredRate: totalCount > 0 ? Math.round((waDeliveredCount / totalCount) * 100) : 0,
      },
      email: {
        sent: emailSent,
        delivered: emailDelivered,
        opened: emailOpenedCount,
        clicked: emailClicked,
        failed: emailFailed + emailBounced,
        openRate: totalCount > 0 ? Math.round((emailOpenedCount / totalCount) * 100) : 0,
        clickRate: totalCount > 0 ? Math.round((emailClicked / totalCount) * 100) : 0,
      },
      failedCount: totalFailed,
    };

    return NextResponse.json({
      success: true,
      broadcast: {
        id: broadcast.id,
        name: broadcast.name,
        channel: broadcast.channel,
        groupType: broadcast.groupType,
        status: broadcast.status,
        scheduledAt: broadcast.scheduledAt,
        sentAt: broadcast.sentAt,
        createdAt: broadcast.createdAt,
        emailSubject: broadcast.emailSubject,
        emailBody: broadcast.emailBody,
        whatsappMessage: broadcast.whatsappMessage,
      },
      stats
    });
  } catch (error: any) {
    console.error("Error in GET /api/admin/broadcasts/[id]:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const broadcast = await prisma.broadcast.findUnique({
      where: { id }
    });

    if (!broadcast) {
      return NextResponse.json({ error: "Broadcast not found" }, { status: 404 });
    }

    if (broadcast.status !== "DRAFT" && broadcast.status !== "SCHEDULED") {
      return NextResponse.json({ error: "Only draft or scheduled campaigns can be deleted" }, { status: 400 });
    }

    await prisma.broadcast.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error in DELETE /api/admin/broadcasts/[id]:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
