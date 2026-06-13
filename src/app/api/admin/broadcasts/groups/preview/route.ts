import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { BuyerPersona, LeadStatus, ScoreGrade, StageKey, StageStatus } from "@prisma/client";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const groupType = searchParams.get("groupType");
    const channel = searchParams.get("channel") || "BOTH"; // WHATSAPP, EMAIL, BOTH

    // Filters
    const persona = searchParams.get("persona");
    const status = searchParams.get("status");
    const stageKey = searchParams.get("stageKey");
    const grade = searchParams.get("grade");
    const corridor = searchParams.get("corridor");
    const minBudget = searchParams.get("minBudget") ? parseFloat(searchParams.get("minBudget")!) : null;
    const maxBudget = searchParams.get("maxBudget") ? parseFloat(searchParams.get("maxBudget")!) : null;
    const leadIdsStr = searchParams.get("leadIds");
    const leadIds = leadIdsStr ? leadIdsStr.split(",").filter(Boolean) : [];

    const where: any = {};

    switch (groupType) {
      case "PERSONA":
        if (persona) where.persona = persona as BuyerPersona;
        break;
      case "LEAD_STATUS":
        if (status) where.status = status as LeadStatus;
        break;
      case "PIPELINE_STAGE":
        if (stageKey) {
          where.roadmap = {
            stages: {
              some: {
                stageKey: stageKey as StageKey,
                status: StageStatus.IN_PROGRESS,
              },
            },
          };
        }
        break;
      case "SCORE_GRADE":
        if (grade) where.leadScoreGrade = grade as ScoreGrade;
        break;
      case "CORRIDOR_INTEREST":
        if (corridor) {
          where.matches = {
            some: {
              project: {
                corridor: corridor,
              },
              isDismissed: false,
            },
          };
        }
        break;
      case "BUDGET_RANGE":
        where.budget = {};
        if (minBudget !== null) where.budget.gte = minBudget;
        if (maxBudget !== null) where.budget.lte = maxBudget;
        break;
      case "MANUAL_PICK":
        if (leadIds.length > 0) {
          where.id = { in: leadIds };
        } else {
          where.id = "none"; // Return zero leads if none selected
        }
        break;
      case "ALL_LEADS":
      default:
        break;
    }

    const leads = await prisma.lead.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        emailOptOut: true,
        whatsappOptOut: true,
      },
    });

    // Segment counts based on opt-out and missing details
    let totalLeads = leads.length;
    let skippedOptOut = 0;
    let skippedMissingContact = 0;
    const validRecipients: typeof leads = [];

    for (const lead of leads) {
      const email = lead.email?.trim();
      const phone = lead.phone?.trim();

      const needsEmail = channel === "EMAIL" || channel === "BOTH";
      const needsWhatsapp = channel === "WHATSAPP" || channel === "BOTH";

      let optOut = false;
      let missingContact = false;

      if (needsEmail) {
        if (!email) missingContact = true;
        if (lead.emailOptOut) optOut = true;
      }

      if (needsWhatsapp) {
        if (!phone) missingContact = true;
        if (lead.whatsappOptOut) optOut = true;
      }

      if (optOut) {
        skippedOptOut++;
      } else if (missingContact) {
        skippedMissingContact++;
      } else {
        validRecipients.push(lead);
      }
    }

    return NextResponse.json({
      success: true,
      totalLeads,
      skippedOptOut,
      skippedMissingContact,
      recipientCount: validRecipients.length,
      sampleLead: validRecipients[0] || null,
      leadsList: validRecipients.map(r => ({ id: r.id, name: r.name, email: r.email, phone: r.phone }))
    });
  } catch (error: any) {
    console.error("Error in GET /api/admin/broadcasts/groups/preview:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
