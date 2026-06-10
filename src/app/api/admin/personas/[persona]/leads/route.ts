import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { BuyerPersona } from "@prisma/client";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ persona: string }> }
) {
  const { persona } = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Validate persona parameter
    if (!Object.values(BuyerPersona).includes(persona as BuyerPersona)) {
      return NextResponse.json({ error: "Invalid persona key" }, { status: 400 });
    }

    const leads = await prisma.lead.findMany({
      where: {
        persona: persona as BuyerPersona
      },
      orderBy: {
        createdAt: "desc"
      },
      include: {
        project: true
      }
    });

    return NextResponse.json({ success: true, leads });
  } catch (error: any) {
    console.error(`Error in GET /api/admin/personas/${persona}/leads:`, error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
