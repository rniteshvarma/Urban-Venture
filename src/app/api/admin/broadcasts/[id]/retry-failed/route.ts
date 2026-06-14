import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { processBroadcastRetry } from "@/lib/broadcast-worker";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const broadcast = await prisma.broadcast.findUnique({
      where: { id }
    });

    if (!broadcast) {
      return NextResponse.json({ error: "Broadcast not found" }, { status: 404 });
    }

    if (broadcast.status === "DRAFT" || broadcast.status === "SCHEDULED") {
      return NextResponse.json({ error: "Only dispatched, completed, or failed broadcasts can be retried." }, { status: 400 });
    }

    // Trigger background process
    processBroadcastRetry(id).catch((err) => {
      console.error(`[Background Retry Trigger Error] Broadcast ${id}:`, err);
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error in POST /api/admin/broadcasts/[id]/retry-failed:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
