import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { calculateLeadScore } from "@/lib/lead-scorer";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get("secret");

    // Allow auth via session (admin user) OR cron secret (automatic scheduling)
    const isCronAuthorized = secret && secret === process.env.CRON_SECRET;
    const isAdminAuthorized = session && session.user.role === "ADMIN";

    if (!isCronAuthorized && !isAdminAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const leads = await prisma.lead.findMany({
      select: { id: true }
    });

    console.log(`Starting bulk rescoring for ${leads.length} leads...`);
    let successCount = 0;

    for (const lead of leads) {
      try {
        await calculateLeadScore(lead.id);
        successCount++;
      } catch (err) {
        console.error(`Failed to calculate score for lead ${lead.id}:`, err);
      }
    }

    return NextResponse.json({ 
      success: true, 
      totalProcessed: leads.length, 
      successCount 
    });
  } catch (error: any) {
    console.error("Error in POST /api/admin/leads/score-all:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
