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
    const { searchParams } = new URL(req.url);
    const filter = searchParams.get("filter"); // FAILED, UNDELIVERED, ALL
    const search = searchParams.get("search") || "";

    const where: any = { broadcastId: id };

    if (filter === "FAILED") {
      where.OR = [
        { whatsappStatus: "FAILED" },
        { emailStatus: "FAILED" },
        { emailStatus: "BOUNCED" },
      ];
    } else if (filter === "UNDELIVERED") {
      where.OR = [
        { whatsappStatus: { in: ["FAILED", "PENDING"] } },
        { emailStatus: { in: ["FAILED", "BOUNCED", "PENDING"] } },
      ];
    }

    if (search.trim()) {
      where.lead = {
        name: { contains: search, mode: "insensitive" }
      };
    }

    const recipients = await prisma.broadcastRecipient.findMany({
      where,
      include: {
        lead: {
          select: {
            name: true,
            email: true,
            phone: true,
          }
        }
      },
      orderBy: { id: "asc" }
    });

    return NextResponse.json({ success: true, recipients });
  } catch (error: any) {
    console.error("Error in GET /api/admin/broadcasts/[id]/recipients:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
