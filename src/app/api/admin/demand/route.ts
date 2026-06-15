import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET /api/admin/demand - List all demand data
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const demand = await prisma.demandTrend.findMany({
      orderBy: [
        { corridor: "asc" },
        { year: "desc" },
        { month: "desc" }
      ]
    });

    return NextResponse.json(demand);
  } catch (error: any) {
    console.error("Error in GET /api/admin/demand:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
