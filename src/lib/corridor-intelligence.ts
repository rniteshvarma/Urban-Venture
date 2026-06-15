import prisma from "./prisma";
import Anthropic from "@anthropic-ai/sdk";
import { ApprovalType } from "@prisma/client";

// Helper to determine status weight for Infra projects
function getInfraStatusWeight(status: string): number {
  switch (status) {
    case "COMPLETE": return 10;
    case "PARTIALLY_COMPLETE": return 9;
    case "UNDER_CONSTRUCTION": return 8;
    case "APPROVED": return 6;
    case "LAND_ACQUISITION": return 4;
    case "ANNOUNCED": return 2;
    case "DELAYED": return 1;
    default: return 0;
  }
}

// Generate static fallback AI commentary and drivers for local/mock testing
function getFallbackAIAnalysis(corridor: string, score: number) {
  let sentiment = "NEUTRAL";
  if (score >= 75) sentiment = "BULLISH";
  else if (score < 50) sentiment = "CAUTIOUS";

  const driversMap: Record<string, string[]> = {
    "Shadnagar": [
      "Strategic proximity to the upcoming Regional Ring Road (RRR) Southern Corridor.",
      "High affordability with residential plotting rates under ₹4,000/sqft.",
      "Rapidly rising search volume and investor inquiries on the portal."
    ],
    "Pharma City": [
      "Direct exposure to the massive Hyderabad Pharma City greenfield industrial development.",
      "Proposed metro connectivity extension linking the zone to central hubs.",
      "Strong layout sanctions and land allotments by TSIIC."
    ],
    "Kokapet": [
      "Premium location in West Hyderabad close to the Financial District.",
      "High-density Neopolis commercial and residential high-rise bidding.",
      "Excellent connectivity via Outer Ring Road (ORR) Exit 1."
    ],
    "Kompally": [
      "Established residential corridor in North Hyderabad with robust retail and lifestyle infrastructure.",
      "Stable rental demand driven by IT professionals and families.",
      "Flyover and highway widening projects easing traffic bottlenecks."
    ]
  };

  const risksMap: Record<string, string[]> = {
    "Shadnagar": [
      "Longer gestation period (5-7 years) for commercial and utility infra development.",
      "Speculative pricing bubbles in localized outer layouts."
    ],
    "Pharma City": [
      "Environmental clearance delays in immediate manufacturing zone boundaries.",
      "Slow initial commercial retail establishment."
    ],
    "Kokapet": [
      "Very high entry ticket size limiting retail investor participation.",
      "Potential high-density infrastructure congestion over the next decade."
    ]
  };

  const defaultDrivers = [
    `Strong connectivity improvements via key highway projects.`,
    `Rapid developer layouts acquisition in the region.`,
    `Increasing inquiry velocity on the investor portal.`
  ];

  const defaultRisks = [
    `Delayed infrastructure completion timelines.`,
    `Water supply and public utility grid connectivity bottlenecks.`
  ];

  const keyDrivers = driversMap[corridor] || defaultDrivers;
  const keyRisks = risksMap[corridor] || defaultRisks;

  let bestFor = ["NRI_INVESTOR", "LAND_SPECULATOR"];
  if (corridor === "Kokapet") bestFor = ["NRI_INVESTOR", "HNI_PORTFOLIO_BUILDER"];
  else if (corridor === "Kompally") bestFor = ["FIRST_TIME_BUYER", "PROFESSIONAL_FIRST_HOME"];

  return {
    keyDrivers,
    keyRisks,
    bestFor,
    adminNote: `${corridor} shows a ${sentiment.toLowerCase()} sentiment score of ${score}/100. Growth is anchored by major government announcements, developer activity, and steady historical price growth.`
  };
}

export async function computeCorridorScore(corridor: string) {
  console.log(`Calculating Corridor Intelligence Score for: ${corridor}`);

  // 1. INFRA SCORE (0-25)
  // Count InfraProjects affecting this corridor, weight by status and reImpactScore
  const infraProjects = await prisma.infraProject.findMany({
    where: {
      affectedCorridors: {
        has: corridor
      },
      isPublished: true
    }
  });

  let totalInfraWeight = 0;
  for (const proj of infraProjects) {
    const statusWeight = getInfraStatusWeight(proj.status);
    totalInfraWeight += statusWeight * proj.reImpactScore;
  }
  // Max out at 25. (Using a factor of 0.2 to map a score of 125 to 25)
  const infraScore = Math.min(25, Math.round(totalInfraWeight * 0.2));

  // 2. APPROVAL SCORE (0-25)
  // Count approvals in the last 3 years (36 months). Recency bonus: last 12 months = 1.5x
  const threeYearsAgo = new Date();
  threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);

  const approvals = await prisma.approvalRecord.findMany({
    where: {
      corridor: corridor,
      isPublished: true,
      approvalDate: {
        gte: threeYearsAgo
      }
    }
  });

  const now = new Date();
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  let approvalPoints = 0;
  for (const app of approvals) {
    let basePoints = 3; // default
    if (app.approvalType === ApprovalType.RERA_REGISTRATION) {
      basePoints = 5;
    } else if (app.approvalType === ApprovalType.LAYOUT_APPROVAL) {
      basePoints = 4;
    } else if (app.approvalType === ApprovalType.BUILDING_PERMISSION) {
      basePoints = 2;
    }

    let isRecent = false;
    if (app.approvalDate) {
      const appDate = new Date(app.approvalDate);
      isRecent = appDate >= oneYearAgo;
    }

    const multiplier = isRecent ? 1.5 : 1.0;
    approvalPoints += basePoints * multiplier;
  }
  const approvalScore = Math.min(25, Math.round(approvalPoints));

  // 3. DEMAND SCORE (0-25)
  // Average absorption last 6 months * 0.5 + trends
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const demandTrends = await prisma.demandTrend.findMany({
    where: {
      corridor: corridor,
      createdAt: {
        gte: sixMonthsAgo
      }
    },
    orderBy: {
      year: "desc"
    }
  });

  let avgAbsorption = 12.0; // fallback standard absorption rate (12%)
  if (demandTrends.length > 0) {
    const validAbsorptions = demandTrends.filter(d => d.absorptionRate !== null);
    if (validAbsorptions.length > 0) {
      avgAbsorption = validAbsorptions.reduce((sum, d) => sum + (d.absorptionRate || 0), 0) / validAbsorptions.length;
    }
  }

  // Calculate search & inquiry trends (compare last 3 months vs previous 3 months)
  let searchTrendPoints = 0;
  let inquiryTrendPoints = 0;

  if (demandTrends.length >= 6) {
    const recent3 = demandTrends.slice(0, 3);
    const older3 = demandTrends.slice(3, 6);

    const recentSearch = recent3.reduce((sum, d) => sum + (d.searchVolume || 0), 0);
    const olderSearch = older3.reduce((sum, d) => sum + (d.searchVolume || 0), 0);

    const recentInquiries = recent3.reduce((sum, d) => sum + (d.inquiryCount || 0), 0);
    const olderInquiries = older3.reduce((sum, d) => sum + (d.inquiryCount || 0), 0);

    if (olderSearch > 0) {
      const searchRatio = recentSearch / olderSearch;
      if (searchRatio >= 1.2) searchTrendPoints = 6;
      else if (searchRatio >= 1.05) searchTrendPoints = 4;
      else if (searchRatio >= 0.95) searchTrendPoints = 2;
    }

    if (olderInquiries > 0) {
      const inquiryRatio = recentInquiries / olderInquiries;
      if (inquiryRatio >= 1.2) inquiryTrendPoints = 6;
      else if (inquiryRatio >= 1.05) inquiryTrendPoints = 4;
      else if (inquiryRatio >= 0.95) inquiryTrendPoints = 2;
    }
  } else {
    // If not enough data, give moderate default points
    searchTrendPoints = 3;
    inquiryTrendPoints = 3;
  }

  const demandScore = Math.min(25, Math.round(avgAbsorption * 0.5 + searchTrendPoints + inquiryTrendPoints));

  // 4. APPRECIATION SCORE (0-25)
  // Average YoY price change last 3 years
  const priceHistory = await prisma.appreciationHistory.findMany({
    where: {
      corridor: corridor
    },
    orderBy: {
      year: "desc"
    },
    take: 3
  });

  let avgYoY = 12.0; // fallback standard 12% YoY appreciation
  if (priceHistory.length > 0) {
    avgYoY = priceHistory.reduce((sum, p) => sum + p.yoyChange, 0) / priceHistory.length;
  }

  // Points: 5%=5pts, 10%=10pts, 15%=15pts, 20%=20pts, 25%+=25pts
  const appreciationScore = Math.min(25, Math.max(0, Math.round(avgYoY)));

  // 5. OVERALL SCORE
  const overallScore = infraScore + approvalScore + demandScore + appreciationScore;

  // SENTIMENT
  let investorSentiment: "BULLISH" | "NEUTRAL" | "CAUTIOUS" = "NEUTRAL";
  if (overallScore >= 75) {
    investorSentiment = "BULLISH";
  } else if (overallScore < 50) {
    investorSentiment = "CAUTIOUS";
  }

  // 6. CALL CLAUDE FOR KEY DRIVERS AND COMMENTARY (with fallback)
  let keyDrivers: string[] = [];
  let keyRisks: string[] = [];
  let bestFor: string[] = [];
  let adminNote = "";

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === "mock-anthropic-key-for-local-testing" || apiKey.trim() === "") {
    console.log("Using local mock AI commentary (API key not configured/mocked)");
    const fallback = getFallbackAIAnalysis(corridor, overallScore);
    keyDrivers = fallback.keyDrivers;
    keyRisks = fallback.keyRisks;
    bestFor = fallback.bestFor;
    adminNote = fallback.adminNote;
  } else {
    try {
      const anthropic = new Anthropic({ apiKey });
      const systemPrompt = "You are a senior real estate analyst specializing in Hyderabad markets. Always respond ONLY with a clean JSON object. Do not include markdown formatting or explanations.";
      
      const userPrompt = `
        Corridor: ${corridor}
        Infrastructure projects nearby: ${JSON.stringify(infraProjects.map(p => ({ name: p.name, status: p.status, score: p.reImpactScore })))}
        Recent layout and RERA approvals: ${JSON.stringify(approvals.map(a => ({ name: a.projectName, type: a.approvalType, authority: a.authority })))}
        Price appreciation history: ${JSON.stringify(priceHistory.map(p => ({ year: p.year, price: p.pricePerSqFt, yoy: p.yoyChange })))}
        Average absorption rate: ${avgAbsorption.toFixed(1)}%
        Overall calculated intelligence score: ${overallScore}/100
        Sentiment: ${investorSentiment}

        Generate key drivers, risks, suitability, and an investor commentary for this corridor.
        Respond ONLY in valid JSON:
        {
          "keyDrivers": ["driver1", "driver2", "driver3"],
          "keyRisks": ["risk1", "risk2"],
          "bestFor": ["PERSONA_NAME1", "PERSONA_NAME2"],
          "adminNote": "2-sentence market commentary for investors"
        }

        Note: bestFor values MUST be selected from: "FIRST_TIME_BUYER", "NRI_INVESTOR", "LAND_SPECULATOR", "RETIREMENT_PLANNER", "HNI_PORTFOLIO_BUILDER", "PROFESSIONAL_FIRST_HOME".
      `;

      const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1000,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      });

      const content = response.content[0].type === "text" ? response.content[0].text : "";
      const jsonStart = content.indexOf("{");
      const jsonEnd = content.lastIndexOf("}");
      if (jsonStart !== -1 && jsonEnd !== -1) {
        const parsed = JSON.parse(content.substring(jsonStart, jsonEnd + 1));
        keyDrivers = parsed.keyDrivers || [];
        keyRisks = parsed.keyRisks || [];
        bestFor = parsed.bestFor || [];
        adminNote = parsed.adminNote || "";
      } else {
        throw new Error("Could not parse JSON from Claude response");
      }
    } catch (e) {
      console.error("Failed to generate AI commentary from Claude, falling back", e);
      const fallback = getFallbackAIAnalysis(corridor, overallScore);
      keyDrivers = fallback.keyDrivers;
      keyRisks = fallback.keyRisks;
      bestFor = fallback.bestFor;
      adminNote = fallback.adminNote;
    }
  }

  // Update or Create CorridorIntelligence record
  const result = await prisma.corridorIntelligence.upsert({
    where: {
      corridor: corridor
    },
    update: {
      overallScore,
      infraScore,
      approvalScore,
      demandScore,
      appreciationScore,
      investorSentiment,
      adminNote,
      keyDrivers,
      keyRisks,
      bestFor,
      lastComputedAt: new Date()
    },
    create: {
      corridor,
      overallScore,
      infraScore,
      approvalScore,
      demandScore,
      appreciationScore,
      investorSentiment,
      adminNote,
      keyDrivers,
      keyRisks,
      bestFor,
      lastComputedAt: new Date()
    }
  });

  return result;
}

export async function computeAllCorridorScores() {
  // Get all unique corridors from CorridorMetrics
  const corridors = await prisma.corridorMetrics.findMany({
    select: {
      corridor: true
    }
  });

  console.log(`Starting scoring recomputation for ${corridors.length} corridors...`);
  const results = [];
  for (const c of corridors) {
    try {
      const res = await computeCorridorScore(c.corridor);
      results.push(res);
    } catch (e) {
      console.error(`Failed to compute score for ${c.corridor}:`, e);
    }
  }
  return results;
}
