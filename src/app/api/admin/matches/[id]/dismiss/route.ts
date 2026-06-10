import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const match = await prisma.projectLeadMatch.update({
      where: { id },
      data: {
        isDismissed: true,
      },
    });

    return NextResponse.json({ success: true, match });
  } catch (error: any) {
    console.error(`Error in POST /api/admin/matches/${id}/dismiss:`, error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
