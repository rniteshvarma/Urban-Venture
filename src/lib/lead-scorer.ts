import { ScoreGrade, LeadStatus } from "@prisma/client";
import prisma from "./prisma";

interface ScoreBreakdown {
  budget: number;
  horizon: number;
  searches: number;
  stage: number;
  recency: number;
  source: number;
  completeness: number;
  corridorBonus?: number;
}

export async function calculateLeadScore(leadId: string): Promise<{
  score: number;
  grade: ScoreGrade;
  factors: ScoreBreakdown;
} | null> {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      user: {
        include: {
          searches: true
        }
      },
      project: true
    }
  });

  if (!lead) return null;

  // 1. Budget size (20pts)
  // <25L=5, 25-50L=10, 50L-1Cr=15, >1Cr=20
  let budgetScore = 5;
  if (lead.budget > 100) budgetScore = 20;
  else if (lead.budget >= 50) budgetScore = 15;
  else if (lead.budget >= 25) budgetScore = 10;

  // 2. Horizon alignment (15pts)
  // 3-7 years = 15, 1-2 years = 8, 8-10 years = 10, others = 5
  let horizonScore = 5;
  if (lead.horizon >= 3 && lead.horizon <= 7) horizonScore = 15;
  else if (lead.horizon >= 8 && lead.horizon <= 10) horizonScore = 10;
  else if (lead.horizon >= 1 && lead.horizon <= 2) horizonScore = 8;

  // 3. Number of AI searches (20pts)
  // 1=5, 2=10, 3=15, 4+=20
  const searchCount = lead.user?.searches?.length || 0;
  let searchScore = 0;
  if (searchCount >= 4) searchScore = 20;
  else if (searchCount === 3) searchScore = 15;
  else if (searchCount === 2) searchScore = 10;
  else if (searchCount === 1) searchScore = 5;

  // 4. Stage in pipeline (20pts)
  // NEW=2, CONTACTED=6, INTERESTED=12, NEGOTIATING=18, CONVERTED=20, LOST=0
  let stageScore = 0;
  if (lead.status === LeadStatus.CONVERTED) stageScore = 20;
  else if (lead.status === LeadStatus.NEGOTIATING) stageScore = 18;
  else if (lead.status === LeadStatus.INTERESTED) stageScore = 12;
  else if (lead.status === LeadStatus.CONTACTED) stageScore = 6;
  else if (lead.status === LeadStatus.NEW) stageScore = 2;

  // 5. Recency of last activity (15pts)
  // Today=15, 1-3 days=12, 4-7 days=8, 8-14 days=4, 14+ days=0
  const lastActivity = lead.updatedAt ? new Date(lead.updatedAt) : new Date(lead.createdAt);
  const diffTime = Math.abs(new Date().getTime() - lastActivity.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  let recencyScore = 0;
  if (diffDays <= 1) recencyScore = 15;
  else if (diffDays <= 3) recencyScore = 12;
  else if (diffDays <= 7) recencyScore = 8;
  else if (diffDays <= 14) recencyScore = 4;

  // 6. Lead source quality (5pts)
  // Portal=5, Manual=3, Import/other=1
  let sourceScore = 1;
  const sourceLower = lead.source?.toLowerCase() || "";
  if (sourceLower.includes("portal")) sourceScore = 5;
  else if (sourceLower.includes("manual")) sourceScore = 3;

  // 7. Profile completeness (5pts)
  // Has phone+email+budget+horizon = 5, missing any = 2
  const isComplete = lead.phone && lead.email && lead.budget && lead.horizon;
  const completenessScore = isComplete ? 5 : 2;

  // 8. Corridor Intelligence Bonus (Up to +8pts)
  // +5 for score > 75, +3 for BULLISH sentiment corridor
  let corridorScoreBonus = 0;
  try {
    const corridorIntels = await prisma.corridorIntelligence.findMany();
    let matchedIntel = null;

    if (lead.project?.corridor) {
      const projCorridor = lead.project.corridor.toLowerCase();
      matchedIntel = corridorIntels.find(
        c => c.corridor.toLowerCase() === projCorridor
      );
    }

    if (!matchedIntel && lead.notes) {
      const notesLower = lead.notes.toLowerCase();
      // Find a corridor name inside lead notes
      matchedIntel = corridorIntels.find(
        c => notesLower.includes(c.corridor.toLowerCase())
      );
    }

    if (matchedIntel) {
      if (matchedIntel.overallScore > 75) corridorScoreBonus += 5;
      if (matchedIntel.investorSentiment === "BULLISH") corridorScoreBonus += 3;
    }
  } catch (error) {
    console.error("Failed to calculate corridor score bonus in lead scorer", error);
  }

  // Sum total score
  const totalScore = budgetScore + horizonScore + searchScore + stageScore + recencyScore + sourceScore + completenessScore + corridorScoreBonus;

  // Calculate Grade cutoffs
  let grade: ScoreGrade = ScoreGrade.D;
  if (totalScore >= 75) grade = ScoreGrade.A;
  else if (totalScore >= 50) grade = ScoreGrade.B;
  else if (totalScore >= 25) grade = ScoreGrade.C;

  const factors: ScoreBreakdown = {
    budget: budgetScore,
    horizon: horizonScore,
    searches: searchScore,
    stage: stageScore,
    recency: recencyScore,
    source: sourceScore,
    completeness: completenessScore,
    corridorBonus: corridorScoreBonus
  };

  // Update Lead in database
  await prisma.lead.update({
    where: { id: leadId },
    data: {
      leadScore: totalScore,
      leadScoreGrade: grade,
      leadScoreUpdatedAt: new Date(),
      leadScoreFactors: factors as any // Cast to Json
    }
  });

  return {
    score: totalScore,
    grade,
    factors
  };
}
