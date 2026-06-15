import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { computeCorridorScore } from "@/lib/corridor-intelligence";

// POST /api/admin/intelligence/[corridor]/recompute - Recompute score for a single corridor
export async function POST(req: Request, { params }: { params: Promise<{ corridor: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { corridor } = await params;
    const decodedCorridor = decodeURIComponent(corridor);

    const result = await computeCorridorScore(decodedCorridor);

    return NextResponse.json({
      success: true,
      message: `Successfully recomputed score for ${decodedCorridor}.`,
      result
    });
  } catch (error: any) {
    console.error("Error in POST /api/admin/intelligence/[corridor]/recompute:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
