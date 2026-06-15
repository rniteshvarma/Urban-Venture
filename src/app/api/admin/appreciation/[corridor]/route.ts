import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET /api/admin/appreciation/[corridor] - Read price points for a specific corridor
export async function GET(req: Request, { params }: { params: Promise<{ corridor: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { corridor } = await params;

    // Decodes %20 or other URL-encoded characters
    const decodedCorridor = decodeURIComponent(corridor);

    const points = await prisma.appreciationHistory.findMany({
      where: {
        corridor: decodedCorridor
      },
      orderBy: [
        { year: "asc" },
        { quarter: "asc" }
      ]
    });

    return NextResponse.json(points);
  } catch (error: any) {
    console.error("Error in GET /api/admin/appreciation/[corridor]:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}

// DELETE /api/admin/appreciation/[corridor] - Optional deletion of a single point by ID (via query parameter or body)
export async function DELETE(req: Request, { params }: { params: Promise<{ corridor: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Data point ID is required" }, { status: 400 });
    }

    await prisma.appreciationHistory.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error in DELETE /api/admin/appreciation/[corridor]:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
