import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const match = await prisma.projectLeadMatch.findUnique({
      where: { id },
      include: {
        lead: true,
        project: true,
      },
    });

    if (!match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    const lead = match.lead;
    const project = match.project;

    // Generate custom pitch text
    const pitchText = `Hi ${lead.name},\n\nI have an investment opportunity that matches your criteria:\n\n*${project.name}* by *${project.developer}* in *${project.corridor}*.\n\n• Price Range: ₹${project.minBudgetLakhs}L - ₹${project.maxBudgetLakhs}L\n• Horizon: ${project.minHorizonYears}-${project.maxHorizonYears} years\n• Risk Profile: ${project.riskLevel}\n• Highlights: ${project.infraHighlights.slice(0, 3).join(", ")}\n\nThis project fits your budget (₹${lead.budget}L) and investment horizon (${lead.horizon} years). Would you like to review the project brochure or schedule a site visit?`;

    // Standard WhatsApp Send Link
    let cleanPhone = lead.phone.replace(/\D/g, "");
    if (cleanPhone.length === 10 && (cleanPhone.startsWith("7") || cleanPhone.startsWith("8") || cleanPhone.startsWith("9"))) {
      cleanPhone = "91" + cleanPhone;
    }
    
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(pitchText)}`;

    return NextResponse.json({
      success: true,
      pitchText,
      whatsappUrl,
      leadName: lead.name,
      projectName: project.name,
      phone: lead.phone
    });
  } catch (error: any) {
    console.error(`Error in GET /api/admin/matches/${id}/pitch:`, error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
