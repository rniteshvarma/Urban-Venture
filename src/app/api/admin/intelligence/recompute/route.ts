import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { computeAllCorridorScores } from "@/lib/corridor-intelligence";

// POST /api/admin/intelligence/recompute - Recompute all corridor scores
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const results = await computeAllCorridorScores();

    return NextResponse.json({
      success: true,
      message: `Successfully recomputed scores for ${results.length} corridors.`,
      results
    });
  } catch (error: any) {
    console.error("Error in POST /api/admin/intelligence/recompute:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
