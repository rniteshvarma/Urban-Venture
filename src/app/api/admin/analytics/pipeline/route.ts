import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { StageKey, StageStatus } from "@prisma/client";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Fetch all roadmaps with stages & lead status
    const roadmaps = await prisma.leadRoadmap.findMany({
      include: {
        stages: {
          orderBy: { order: "asc" }
        },
        lead: true
      }
    });

    const totalLeads = roadmaps.length;

    // 2. Calculate current active stage counts and cumulative funnel counts
    // Stages: INITIAL_CONTACT, NEEDS_ASSESSMENT, SITE_VISIT, PROPOSAL_SENT, NEGOTIATION, LEGAL_REVIEW, BOOKING_AMOUNT, AGREEMENT_SIGNED, CLOSURE
    const activeStageCounts: Record<StageKey, number> = {
      INITIAL_CONTACT: 0,
      NEEDS_ASSESSMENT: 0,
      SITE_VISIT: 0,
      PROPOSAL_SENT: 0,
      NEGOTIATION: 0,
      LEGAL_REVIEW: 0,
      BOOKING_AMOUNT: 0,
      AGREEMENT_SIGNED: 0,
      CLOSURE: 0
    };

    const cumulativeCounts: Record<StageKey, number> = {
      INITIAL_CONTACT: 0,
      NEEDS_ASSESSMENT: 0,
      SITE_VISIT: 0,
      PROPOSAL_SENT: 0,
      NEGOTIATION: 0,
      LEGAL_REVIEW: 0,
      BOOKING_AMOUNT: 0,
      AGREEMENT_SIGNED: 0,
      CLOSURE: 0
    };

    for (const rm of roadmaps) {
      // Find active stage
      let activeStage = rm.stages.find(s => s.status === StageStatus.IN_PROGRESS);
      if (!activeStage) {
        activeStage = rm.stages.find(s => s.status === StageStatus.PENDING);
      }
      if (!activeStage) {
        activeStage = rm.stages[rm.stages.length - 1]; // fallback to last
      }

      if (activeStage) {
        activeStageCounts[activeStage.stageKey]++;
        
        // Add to cumulative counts for all stages up to the active stage's order
        for (const s of rm.stages) {
          if (s.order <= activeStage.order || s.status === StageStatus.COMPLETED || s.status === StageStatus.SKIPPED) {
            cumulativeCounts[s.stageKey]++;
          }
        }
      }
    }

    const funnelData = Object.keys(cumulativeCounts).map((key) => ({
      stage: key.replace(/_/g, " "),
      count: cumulativeCounts[key as StageKey],
      activeCount: activeStageCounts[key as StageKey]
    }));

    // 3. Stage Velocity Calculation
    // Average days spent in each stage key
    const allCompletedStages = await prisma.roadmapStage.findMany({
      where: {
        status: StageStatus.COMPLETED,
        scheduledAt: { not: null },
        completedAt: { not: null }
      }
    });

    const velocitySum: Record<StageKey, number> = {
      INITIAL_CONTACT: 0,
      NEEDS_ASSESSMENT: 0,
      SITE_VISIT: 0,
      PROPOSAL_SENT: 0,
      NEGOTIATION: 0,
      LEGAL_REVIEW: 0,
      BOOKING_AMOUNT: 0,
      AGREEMENT_SIGNED: 0,
      CLOSURE: 0
    };
    const velocityCount: Record<StageKey, number> = {
      INITIAL_CONTACT: 0,
      NEEDS_ASSESSMENT: 0,
      SITE_VISIT: 0,
      PROPOSAL_SENT: 0,
      NEGOTIATION: 0,
      LEGAL_REVIEW: 0,
      BOOKING_AMOUNT: 0,
      AGREEMENT_SIGNED: 0,
      CLOSURE: 0
    };

    for (const stage of allCompletedStages) {
      if (stage.scheduledAt && stage.completedAt) {
        const diffMs = new Date(stage.completedAt).getTime() - new Date(stage.scheduledAt).getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        velocitySum[stage.stageKey] += diffDays;
        velocityCount[stage.stageKey]++;
      }
    }

    const velocityData = Object.keys(velocitySum).map((key) => {
      const count = velocityCount[key as StageKey];
      const avgDays = count > 0 ? parseFloat((velocitySum[key as StageKey] / count).toFixed(1)) : 0;
      return {
        stage: key.replace(/_/g, " "),
        avgDays: avgDays || 1.5 // Fallback to 1.5 days if no data exists, for nicer initial rendering
      };
    });

    // 4. Agent Performance Table
    const agentsMap = new Map<string, { total: number; converted: number; active: number; value: number }>();

    for (const rm of roadmaps) {
      const agent = rm.assignedTo || rm.lead.assignedTo || "Unassigned";
      if (!agentsMap.has(agent)) {
        agentsMap.set(agent, { total: 0, converted: 0, active: 0, value: 0 });
      }
      
      const stats = agentsMap.get(agent)!;
      stats.total++;
      if (rm.lead.status === "CONVERTED") {
        stats.converted++;
      } else if (rm.lead.status !== "LOST") {
        stats.active++;
      }
      stats.value += rm.estimatedValue || rm.lead.budget || 0;
    }

    const agentPerformance = Array.from(agentsMap.entries()).map(([name, stats]) => {
      const conversionRate = stats.total > 0 ? Math.round((stats.converted / stats.total) * 100) : 0;
      return {
        name,
        totalLeads: stats.total,
        activeLeads: stats.active,
        convertedLeads: stats.converted,
        conversionRate,
        totalValueLakhs: parseFloat(stats.value.toFixed(1))
      };
    });

    // 5. Weekly Intake (last 8 weeks)
    const eightWeeksAgo = new Date();
    eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);

    const weeklyLeads = await prisma.lead.findMany({
      where: {
        createdAt: { gte: eightWeeksAgo }
      },
      select: {
        createdAt: true,
        budget: true
      }
    });

    // Bucket into 8 weeks
    const weeklyData = Array.from({ length: 8 }).map((_, i) => {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - (7 - i) * 7);
      const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

      const leadsInWeek = weeklyLeads.filter(l => {
        const d = new Date(l.createdAt);
        return d >= weekStart && d < weekEnd;
      });

      return {
        week: `Wk -${7 - i}`,
        count: leadsInWeek.length,
        valueLakhs: leadsInWeek.reduce((sum, l) => sum + (l.budget || 0), 0)
      };
    });

    return NextResponse.json({
      success: true,
      totalLeads,
      funnelData,
      velocityData,
      agentPerformance,
      weeklyData
    });
  } catch (error: any) {
    console.error("Error in GET /api/admin/analytics/pipeline:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
