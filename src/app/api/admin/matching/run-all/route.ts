import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { runAllMatching } from "@/lib/matching-engine";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await runAllMatching();

    return NextResponse.json({ success: true, message: "Recalculated matches for all leads and projects." });
  } catch (error: any) {
    console.error("Error in POST /api/admin/matching/run-all:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
