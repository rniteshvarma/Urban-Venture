import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const matches = await prisma.projectLeadMatch.findMany({
      where: {
        leadId: id,
        isDismissed: false,
      },
      include: {
        project: true,
      },
      orderBy: {
        matchScore: "desc",
      },
    });

    return NextResponse.json({ success: true, matches });
  } catch (error: any) {
    console.error(`Error in GET /api/admin/matching/lead/${id}:`, error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
