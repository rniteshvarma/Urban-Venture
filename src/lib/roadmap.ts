import prisma from "./prisma";
import { StageKey, StageStatus } from "@prisma/client";

// Default action items for each pipeline stage
const DEFAULT_ACTIONS: Record<StageKey, string[]> = {
  INITIAL_CONTACT: [
    "Send project brochure via WhatsApp",
    "Log discovery call details in CRM",
    "Confirm target corridor selection"
  ],
  NEEDS_ASSESSMENT: [
    "Detail target ticket size and payment timeline",
    "Identify core requirements (Plots vs Villa)",
    "Shortlist top 3 projects in corridor"
  ],
  SITE_VISIT: [
    "Schedule site visit date and coordinate transportation",
    "Verify project layout and water/power provisions on-site",
    "Get feedback call done post site visit"
  ],
  PROPOSAL_SENT: [
    "Share custom cost sheet with registration charges breakdown",
    "Provide payment plan alternatives (construction vs time-linked)",
    "Request initial copy of KYC documents"
  ],
  NEGOTIATION: [
    "Request final management approvals for builder discount",
    "Resolve payment flexibilities requests",
    "Align on payment terms of booking amount"
  ],
  LEGAL_REVIEW: [
    "Share RERA registration copy & title deeds pack",
    "Draft agreement copy and share with client's legal counsel",
    "Address all due diligence questions"
  ],
  BOOKING_AMOUNT: [
    "Collect booking cheque or verify wire transfer",
    "Generate official booking confirmation receipt",
    "Submit reservation request in builder portal"
  ],
  AGREEMENT_SIGNED: [
    "Draft final sale agreement document",
    "Execute signature in registration office / online",
    "Initiate home loan processing documents (if any)"
  ],
  CLOSURE: [
    "Collect client feedback survey",
    "Close channel partner invoice generation",
    "Deal Closed - Handover official document pack 🎉"
  ]
};

export async function initLeadRoadmap(leadId: string) {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
  });

  if (!lead) return null;

  // Check if roadmap already exists
  const existing = await prisma.leadRoadmap.findUnique({
    where: { leadId },
    include: {
      stages: {
        include: {
          actionItems: true
        }
      }
    }
  });

  if (existing) return existing;

  const targetCloseDate = new Date(lead.createdAt.getTime() + 60 * 24 * 60 * 60 * 1000);

  // 1. Create Roadmap
  const roadmap = await prisma.leadRoadmap.create({
    data: {
      leadId,
      targetCloseDate,
      estimatedValue: lead.budget, // Default estimated value to the lead's budget
      probability: 20,
      assignedTo: lead.assignedTo,
    },
  });

  // 2. Create Stages in sequence to populate ActionItems
  const stages: { stageKey: StageKey; status: StageStatus; order: number }[] = [
    { stageKey: "INITIAL_CONTACT", status: "IN_PROGRESS", order: 1 },
    { stageKey: "NEEDS_ASSESSMENT", status: "PENDING", order: 2 },
    { stageKey: "SITE_VISIT", status: "PENDING", order: 3 },
    { stageKey: "PROPOSAL_SENT", status: "PENDING", order: 4 },
    { stageKey: "NEGOTIATION", status: "PENDING", order: 5 },
    { stageKey: "LEGAL_REVIEW", status: "PENDING", order: 6 },
    { stageKey: "BOOKING_AMOUNT", status: "PENDING", order: 7 },
    { stageKey: "AGREEMENT_SIGNED", status: "PENDING", order: 8 },
    { stageKey: "CLOSURE", status: "PENDING", order: 9 },
  ];

  for (const s of stages) {
    const stage = await prisma.roadmapStage.create({
      data: {
        roadmapId: roadmap.id,
        stageKey: s.stageKey,
        status: s.status,
        order: s.order,
        scheduledAt: s.stageKey === "INITIAL_CONTACT" ? lead.createdAt : null,
      }
    });

    // Create default ActionItems for this stage
    const actions = DEFAULT_ACTIONS[s.stageKey] || [];
    if (actions.length > 0) {
      await prisma.actionItem.createMany({
        data: actions.map(title => ({
          stageId: stage.id,
          title,
          completed: false
        }))
      });
    }
  }

  // Return full roadmap
  return prisma.leadRoadmap.findUnique({
    where: { id: roadmap.id },
    include: {
      stages: {
        include: {
          actionItems: true
        }
      }
    }
  });
}
