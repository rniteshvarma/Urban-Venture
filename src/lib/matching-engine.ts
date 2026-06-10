import prisma from "./prisma";
import { RiskLevel, Project, Lead, PersonaConfig } from "@prisma/client";

export function calculateMatch(
  lead: any,
  project: any,
  personaConfig: any
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  // 1. Budget size (30 pts)
  if (lead.budget >= project.minBudgetLakhs && lead.budget <= project.maxBudgetLakhs) {
    score += 30;
    reasons.push(`Budget (₹${lead.budget}L) fits the project range (₹${project.minBudgetLakhs}L - ₹${project.maxBudgetLakhs}L).`);
  } else if (lead.budget >= project.minBudgetLakhs * 0.8 && lead.budget <= project.maxBudgetLakhs * 1.2) {
    score += 15;
    reasons.push(`Budget (₹${lead.budget}L) is near the project range (₹${project.minBudgetLakhs}L - ₹${project.maxBudgetLakhs}L).`);
  } else {
    reasons.push(`Budget (₹${lead.budget}L) is outside the project range.`);
  }

  // 2. Horizon alignment (20 pts)
  if (lead.horizon >= project.minHorizonYears && lead.horizon <= project.maxHorizonYears) {
    score += 20;
    reasons.push(`Investment horizon (${lead.horizon}Y) overlaps project timeline (${project.minHorizonYears}-${project.maxHorizonYears}Y).`);
  } else if (Math.abs(lead.horizon - project.minHorizonYears) <= 1 || Math.abs(lead.horizon - project.maxHorizonYears) <= 1) {
    score += 10;
    reasons.push(`Investment horizon (${lead.horizon}Y) is close to project timeline.`);
  } else {
    reasons.push(`Investment horizon (${lead.horizon}Y) deviates from project timeline.`);
  }

  // 3. Corridor alignment (25 pts)
  let corridorMatched = false;
  const projectCorridorLower = project.corridor.toLowerCase().trim();
  
  if (lead.user?.searches) {
    for (const search of lead.user.searches) {
      try {
        const responseJson = search.aiResponse as any;
        if (responseJson && Array.isArray(responseJson.corridors)) {
          const hasCorridor = responseJson.corridors.some(
            (c: any) => c && typeof c.name === "string" && c.name.toLowerCase().trim() === projectCorridorLower
          );
          if (hasCorridor) {
            corridorMatched = true;
            break;
          }
        }
      } catch (e) {
        // ignore
      }
    }
  }

  if (corridorMatched) {
    score += 25;
    reasons.push(`Project corridor (${project.corridor}) matches search history.`);
  } else if (lead.city && lead.city.toLowerCase().trim() === project.city.toLowerCase().trim()) {
    score += 10;
    reasons.push(`Project is located in the preferred city (${project.city}).`);
  } else {
    reasons.push(`Project corridor (${project.corridor}) is not in search history.`);
  }

  // 4. Persona Risk level match (15 pts)
  if (personaConfig) {
    const riskLevels = personaConfig.riskLevels || [];
    if (riskLevels.includes(project.riskLevel)) {
      score += 15;
      reasons.push(`Project risk level (${project.riskLevel}) matches ${personaConfig.displayName} profile.`);
    } else {
      const order = { LOW: 0, MEDIUM: 1, HIGH: 2 };
      const leadRisks: number[] = riskLevels.map((r: string) => order[r as keyof typeof order]);
      const projectRiskVal = order[project.riskLevel as keyof typeof order];
      const minDistance = Math.min(...leadRisks.map(r => Math.abs(r - projectRiskVal)));
      if (minDistance === 1) {
        score += 7;
        reasons.push(`Project risk level (${project.riskLevel}) is adjacent to ${personaConfig.displayName} preferences.`);
      } else {
        reasons.push(`Project risk level (${project.riskLevel}) does not align with persona risk appetite.`);
      }
    }
  } else {
    score += 10;
  }

  // 5. Score bonus (10 pts)
  const leadScore = lead.leadScore || 0;
  if (leadScore >= 75) {
    score += 10;
    reasons.push(`High engagement bonus (Lead score grade A).`);
  } else if (leadScore >= 50) {
    score += 5;
    reasons.push(`Engagement bonus (Lead score grade B).`);
  }

  return {
    score: Math.min(100, score),
    reasons
  };
}

export async function runMatchingForLead(leadId: string) {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      user: {
        include: {
          searches: true
        }
      }
    }
  });

  if (!lead) return;

  const personaConfig = lead.persona
    ? await prisma.personaConfig.findUnique({ where: { persona: lead.persona } })
    : null;

  const activeProjects = await prisma.project.findMany({
    where: { status: "ACTIVE" }
  });

  for (const project of activeProjects) {
    const { score, reasons } = calculateMatch(lead, project, personaConfig);
    
    const existingMatch = await prisma.projectLeadMatch.findUnique({
      where: {
        projectId_leadId: {
          projectId: project.id,
          leadId: lead.id
        }
      }
    });

    if (existingMatch) {
      await prisma.projectLeadMatch.update({
        where: { id: existingMatch.id },
        data: {
          matchScore: score,
          matchReasons: reasons,
        }
      });
    } else {
      await prisma.projectLeadMatch.create({
        data: {
          projectId: project.id,
          leadId: lead.id,
          matchScore: score,
          matchReasons: reasons,
          isDismissed: false
        }
      });
    }
  }
}

export async function runMatchingForProject(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId }
  });

  if (!project || project.status !== "ACTIVE") return;

  const leads = await prisma.lead.findMany({
    include: {
      user: {
        include: {
          searches: true
        }
      }
    }
  });

  for (const lead of leads) {
    const personaConfig = lead.persona
      ? await prisma.personaConfig.findUnique({ where: { persona: lead.persona } })
      : null;

    const { score, reasons } = calculateMatch(lead, project, personaConfig);

    const existingMatch = await prisma.projectLeadMatch.findUnique({
      where: {
        projectId_leadId: {
          projectId: project.id,
          leadId: lead.id
        }
      }
    });

    if (existingMatch) {
      await prisma.projectLeadMatch.update({
        where: { id: existingMatch.id },
        data: {
          matchScore: score,
          matchReasons: reasons,
        }
      });
    } else {
      await prisma.projectLeadMatch.create({
        data: {
          projectId: project.id,
          leadId: lead.id,
          matchScore: score,
          matchReasons: reasons,
          isDismissed: false
        }
      });
    }
  }
}

export async function runAllMatching() {
  const leads = await prisma.lead.findMany({
    select: { id: true }
  });
  for (const lead of leads) {
    await runMatchingForLead(lead.id);
  }
}
