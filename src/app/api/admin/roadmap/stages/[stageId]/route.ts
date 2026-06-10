import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { StageKey, StageStatus } from "@prisma/client";

const STAGE_PROBABILITIES: Record<StageKey, number> = {
  INITIAL_CONTACT: 30,
  NEEDS_ASSESSMENT: 40,
  SITE_VISIT: 50,
  PROPOSAL_SENT: 60,
  NEGOTIATION: 70,
  LEGAL_REVIEW: 80,
  BOOKING_AMOUNT: 90,
  AGREEMENT_SIGNED: 95,
  CLOSURE: 100,
};

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ stageId: string }> }
) {
  const { stageId } = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { status, notes, scheduledAt } = body;

    // 1. Find the current stage
    const currentStage = await prisma.roadmapStage.findUnique({
      where: { id: stageId },
      include: {
        roadmap: {
          include: {
            stages: true
          }
        }
      }
    });

    if (!currentStage) {
      return NextResponse.json({ error: "Stage not found" }, { status: 404 });
    }

    const roadmap = currentStage.roadmap;

    // 2. Prepare stage updates
    const stageUpdateData: any = {};
    if (status !== undefined) {
      stageUpdateData.status = status;
      if (status === StageStatus.COMPLETED || status === StageStatus.SKIPPED) {
        stageUpdateData.completedAt = new Date();
      } else {
        stageUpdateData.completedAt = null;
      }
    }
    if (notes !== undefined) {
      stageUpdateData.notes = notes;
    }
    if (scheduledAt !== undefined) {
      stageUpdateData.scheduledAt = scheduledAt ? new Date(scheduledAt) : null;
    }

    // 3. Update the current stage
    const updatedStage = await prisma.roadmapStage.update({
      where: { id: stageId },
      data: stageUpdateData,
    });

    // 4. Auto-advance logic: If this stage is completed, mark the next stage as IN_PROGRESS
    if (status === StageStatus.COMPLETED || status === StageStatus.SKIPPED) {
      const nextStage = roadmap.stages.find(s => s.order === currentStage.order + 1);
      if (nextStage && nextStage.status === StageStatus.PENDING) {
        await prisma.roadmapStage.update({
          where: { id: nextStage.id },
          data: {
            status: StageStatus.IN_PROGRESS,
            scheduledAt: new Date()
          }
        });
      }
    }

    // 5. Calculate new probability & update lead status
    const allStages = await prisma.roadmapStage.findMany({
      where: { roadmapId: roadmap.id },
      orderBy: { order: "asc" }
    });

    let maxCompletedOrder = 0;
    let probability = 20; // default initial probability

    for (const stage of allStages) {
      if (stage.status === StageStatus.COMPLETED || stage.status === StageStatus.SKIPPED) {
        maxCompletedOrder = Math.max(maxCompletedOrder, stage.order);
        probability = STAGE_PROBABILITIES[stage.stageKey] || probability;
      }
    }

    // Update LeadRoadmap probability
    await prisma.leadRoadmap.update({
      where: { id: roadmap.id },
      data: { probability }
    });

    // If CLOSURE (order 9) is completed, set Lead status to CONVERTED
    const closureStage = allStages.find(s => s.stageKey === StageKey.CLOSURE);
    if (closureStage && closureStage.status === StageStatus.COMPLETED) {
      await prisma.lead.update({
        where: { id: roadmap.leadId },
        data: { status: "CONVERTED" }
      });
    }

    // Fetch the fully updated roadmap to return
    const finalRoadmap = await prisma.leadRoadmap.findUnique({
      where: { id: roadmap.id },
      include: {
        stages: {
          orderBy: { order: "asc" },
          include: {
            actionItems: {
              orderBy: { id: "asc" }
            }
          }
        },
        lead: true
      }
    });

    return NextResponse.json({ success: true, roadmap: finalRoadmap });
  } catch (error: any) {
    console.error(`Error in PUT /api/admin/roadmap/stages/${stageId}:`, error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
