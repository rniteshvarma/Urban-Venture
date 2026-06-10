import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const leadId = searchParams.get("leadId") || undefined;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 100;

    const where: any = {};
    if (leadId) {
      where.leadId = leadId;
    }

    const logs = await prisma.whatsAppLog.findMany({
      where,
      include: {
        lead: {
          select: { name: true, phone: true }
        },
        template: {
          select: { name: true }
        }
      },
      orderBy: { createdAt: "desc" },
      take: limit
    });

    return NextResponse.json({ success: true, logs });
  } catch (error: any) {
    console.error("Error in GET /api/admin/whatsapp/logs:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
