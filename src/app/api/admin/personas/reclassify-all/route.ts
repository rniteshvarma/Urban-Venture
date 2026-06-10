import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { classifyLeadPersona } from "@/lib/persona-engine";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const leads = await prisma.lead.findMany({
      select: { id: true }
    });

    console.log(`Starting bulk reclassification for ${leads.length} leads...`);
    let successCount = 0;

    for (const lead of leads) {
      try {
        await classifyLeadPersona(lead.id);
        successCount++;
      } catch (err) {
        console.error(`Failed to classify lead ${lead.id}:`, err);
      }
    }

    return NextResponse.json({ 
      success: true, 
      totalProcessed: leads.length, 
      successCount 
    });
  } catch (error: any) {
    console.error("Error in POST /api/admin/personas/reclassify-all:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
