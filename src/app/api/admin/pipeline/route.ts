import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { initLeadRoadmap } from "@/lib/roadmap";
import { StageKey, StageStatus } from "@prisma/client";

// GET /api/admin/pipeline - Get Kanban columns data
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Auto-initialize any lead that doesn't have a roadmap yet
    const leadsWithoutRoadmap = await prisma.lead.findMany({
      where: {
        roadmap: null
      }
    });

    if (leadsWithoutRoadmap.length > 0) {
      console.log(`Auto-initializing roadmaps for ${leadsWithoutRoadmap.length} leads...`);
      for (const lead of leadsWithoutRoadmap) {
        await initLeadRoadmap(lead.id);
      }
    }

    // Fetch all roadmaps with stages & actionItems
    const roadmaps = await prisma.leadRoadmap.findMany({
      include: {
        stages: {
          orderBy: { order: "asc" },
          include: {
            actionItems: true
          }
        },
        lead: {
          include: {
            project: true
          }
        }
      }
    });

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Prepare Kanban columns
    // We have 7 columns: INITIAL_CONTACT, NEEDS_ASSESSMENT, SITE_VISIT, PROPOSAL_SENT, NEGOTIATION, LEGAL_REVIEW, CLOSING
    const columns: Record<string, any[]> = {
      INITIAL_CONTACT: [],
      NEEDS_ASSESSMENT: [],
      SITE_VISIT: [],
      PROPOSAL_SENT: [],
      NEGOTIATION: [],
      LEGAL_REVIEW: [],
      CLOSING: [] // groups BOOKING_AMOUNT, AGREEMENT_SIGNED, CLOSURE
    };

    let totalStaleCount = 0;

    for (const rm of roadmaps) {
      // Find current active stage
      let activeStage = rm.stages.find(s => s.status === StageStatus.IN_PROGRESS);
      if (!activeStage) {
        activeStage = rm.stages.find(s => s.status === StageStatus.PENDING);
      }
      if (!activeStage) {
        // If all are completed or skipped, active is the last one (CLOSURE)
        activeStage = rm.stages[rm.stages.length - 1];
      }

      // Check if stale
      let isStale = false;
      if (activeStage && activeStage.status === StageStatus.IN_PROGRESS && activeStage.scheduledAt) {
        const scheduledDate = new Date(activeStage.scheduledAt);
        isStale = scheduledDate < sevenDaysAgo;
      }

      if (isStale) {
        totalStaleCount++;
      }

      // Calculate progress percentage
      const completedCount = rm.stages.filter(s => s.status === StageStatus.COMPLETED || s.status === StageStatus.SKIPPED).length;
      const progressPercent = Math.round((completedCount / rm.stages.length) * 100);

      const cardData = {
        id: rm.id,
        leadId: rm.leadId,
        leadName: rm.lead.name,
        leadStatus: rm.lead.status,
        estimatedValue: rm.estimatedValue || rm.lead.budget || 0,
        probability: rm.probability,
        assignedTo: rm.assignedTo || rm.lead.assignedTo || "Unassigned",
        targetCloseDate: rm.targetCloseDate,
        activeStageKey: activeStage ? activeStage.stageKey : "INITIAL_CONTACT",
        activeStageName: activeStage ? activeStage.stageKey.replace(/_/g, " ") : "INITIAL CONTACT",
        progressPercent,
        isStale,
        daysInStage: activeStage && activeStage.scheduledAt 
          ? Math.floor((now.getTime() - new Date(activeStage.scheduledAt).getTime()) / (1000 * 60 * 60 * 24))
          : 0,
        projectName: rm.lead.project?.name || "No matched project",
        city: rm.lead.city
      };

      // Map to column
      const stageKey = activeStage ? activeStage.stageKey : "INITIAL_CONTACT";
      if (stageKey === "BOOKING_AMOUNT" || stageKey === "AGREEMENT_SIGNED" || stageKey === "CLOSURE") {
        columns.CLOSING.push(cardData);
      } else if (columns[stageKey]) {
        columns[stageKey].push(cardData);
      } else {
        columns.INITIAL_CONTACT.push(cardData);
      }
    }

    return NextResponse.json({
      success: true,
      columns,
      staleCount: totalStaleCount
    });
  } catch (error: any) {
    console.error("Error in GET /api/admin/pipeline:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}

// PUT /api/admin/pipeline - Handle drag and drop stage movement
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { roadmapId, targetStageKey } = body;

    if (!roadmapId || !targetStageKey) {
      return NextResponse.json({ error: "Missing roadmapId or targetStageKey" }, { status: 400 });
    }

    // Find the roadmap
    const roadmap = await prisma.leadRoadmap.findUnique({
      where: { id: roadmapId },
      include: {
        stages: {
          orderBy: { order: "asc" }
        }
      }
    });

    if (!roadmap) {
      return NextResponse.json({ error: "Roadmap not found" }, { status: 404 });
    }

    // Resolve target stage key if it's CLOSING
    let actualTargetKey = targetStageKey;
    if (targetStageKey === "CLOSING") {
      // If moving to closing, we default to the first closing stage that isn't completed, or BOOKING_AMOUNT
      const firstClosingStage = roadmap.stages.find(s => 
        (s.stageKey === "BOOKING_AMOUNT" || s.stageKey === "AGREEMENT_SIGNED" || s.stageKey === "CLOSURE") && 
        s.status !== StageStatus.COMPLETED && s.status !== StageStatus.SKIPPED
      );
      actualTargetKey = firstClosingStage ? firstClosingStage.stageKey : "BOOKING_AMOUNT";
    }

    const targetStage = roadmap.stages.find(s => s.stageKey === actualTargetKey);
    if (!targetStage) {
      return NextResponse.json({ error: "Target stage not found" }, { status: 404 });
    }

    // We want to set the target stage to IN_PROGRESS.
    // All stages before it should be set to COMPLETED.
    // All stages after it should be set to PENDING.
    // Also update probability based on the new progress.

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

    let newProbability = 20;

    for (const stage of roadmap.stages) {
      let newStatus = stage.status;
      let completedAt = stage.completedAt;
      let scheduledAt = stage.scheduledAt;

      if (stage.order < targetStage.order) {
        // Must be completed
        newStatus = StageStatus.COMPLETED;
        completedAt = stage.completedAt || new Date();
        newProbability = Math.max(newProbability, STAGE_PROBABILITIES[stage.stageKey]);
      } else if (stage.order === targetStage.order) {
        // Active
        newStatus = StageStatus.IN_PROGRESS;
        scheduledAt = new Date();
        completedAt = null;
      } else {
        // Pending
        newStatus = StageStatus.PENDING;
        scheduledAt = null;
        completedAt = null;
      }

      await prisma.roadmapStage.update({
        where: { id: stage.id },
        data: {
          status: newStatus,
          completedAt,
          scheduledAt
        }
      });
    }

    // Update lead roadmap probability
    await prisma.leadRoadmap.update({
      where: { id: roadmapId },
      data: {
        probability: newProbability
      }
    });

    // If target stage is CLOSURE and it was somehow set to completed directly (not typical for drag-drop to in_progress, but just in case)
    if (actualTargetKey === "CLOSURE" && targetStage.status === StageStatus.COMPLETED) {
      await prisma.lead.update({
        where: { id: roadmap.leadId },
        data: { status: "CONVERTED" }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error in PUT /api/admin/pipeline:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
