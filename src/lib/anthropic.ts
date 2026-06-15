import Anthropic from "@anthropic-ai/sdk";
import prisma from "./prisma";

// Tailored recommendations generator for local dev fallback
function getMockRecommendation(budget: number, horizon: number, city: string) {
  const isHyderabad = city.toLowerCase() === "hyderabad";
  
  let corridors = [];
  
  if (budget <= 40) {
    corridors = [
      {
        name: isHyderabad ? "Shadnagar Corridor" : "Outskirts Zone",
        area: isHyderabad ? "South Hyderabad" : "Periphery",
        matchScore: 94,
        riskLevel: "MEDIUM" as const,
        appreciationMin: 15,
        appreciationMax: 22,
        reasons: [
          `Highly affordable entry point matching the ₹${budget}L budget.`,
          "Rapid land value appreciation driven by the upcoming Regional Ring Road (RRR).",
          "Excellent connectivity to airport via NH-44 highway."
        ],
        infraHighlights: ["Regional Ring Road", "MMTS Phase 2", "NH-44 Expansion"],
        exitOpportunities: ["Resale to developers", "Land banking exit", "Plot subdivision"],
        bestFor: "Long-term land investors looking for maximum multiplier effect"
      },
      {
        name: isHyderabad ? "Yadadri Corridor" : "East Corridor",
        area: isHyderabad ? "East Hyderabad" : "Growth Zone",
        matchScore: 88,
        riskLevel: "HIGH" as const,
        appreciationMin: 18,
        appreciationMax: 25,
        reasons: [
          "Low cost open plots matching budget limits.",
          "Spurred by tourism and infrastructure developments around the Yadadri temple town.",
          "Good link to Warangal Highway."
        ],
        infraHighlights: ["Yadadri Temple Tourism Hub", "Warangal Highway (NH-163)", "Proposed MMTS"],
        exitOpportunities: ["Second home resale", "Hotel/hospitality lease", "Long term plot resale"],
        bestFor: "High-risk, high-return speculative investors"
      }
    ];
  } else if (budget <= 100) {
    corridors = [
      {
        name: isHyderabad ? "Pharma City Influence Zone" : "Industrial Corridor",
        area: isHyderabad ? "South-East Hyderabad" : "Industrial Pocket",
        matchScore: 92,
        riskLevel: "MEDIUM" as const,
        appreciationMin: 14,
        appreciationMax: 20,
        reasons: [
          `Fits investment band with robust potential for ₹${budget}L allocation.`,
          "Located near one of the world's largest pharmaceutical manufacturing clusters.",
          "Expected influx of over 500,000 workers creating massive housing demand."
        ],
        infraHighlights: ["Pharma City SEZ", "ORR Exit 14 Connection", "Proposed Metro Line"],
        exitOpportunities: ["Rental income from pharma employees", "Resale to developers", "Retail shop leasing"],
        bestFor: "Investors seeking moderate-risk capital growth and future rental yields"
      },
      {
        name: isHyderabad ? "Adibatla IT Corridor" : "Tech Park Extension",
        area: isHyderabad ? "South Hyderabad" : "Tech Pocket",
        matchScore: 87,
        riskLevel: "LOW" as const,
        appreciationMin: 12,
        appreciationMax: 16,
        reasons: [
          "Established tech hubs including TCS and Tata Aerospace SEZ.",
          "Direct access to Outer Ring Road (ORR) Exit 12.",
          "Immediate demand for residential apartments and mid-range villas."
        ],
        infraHighlights: ["Tata Aerospace SEZ", "TCS Campus", "Outer Ring Road (ORR)"],
        exitOpportunities: ["Resale to IT professionals", "Residential leasing", "Ready property resale"],
        bestFor: "Conservative investors looking for stable growth and quick liquidation"
      }
    ];
  } else {
    corridors = [
      {
        name: isHyderabad ? "Kokapet & Financial District Extension" : "Premium IT Belt",
        area: isHyderabad ? "West Hyderabad" : "Commercial Hub",
        matchScore: 96,
        riskLevel: "LOW" as const,
        appreciationMin: 10,
        appreciationMax: 15,
        reasons: [
          `Premium location ideally matching the ₹${budget}L luxury scale.`,
          "Neopolis IT SEZ development driving high-value commercial and residential bids.",
          "Favored by premium corporate executives and ultra-high-net-worth individuals (HNIs)."
        ],
        infraHighlights: ["Neopolis IT SEZ", "ORR Exit 1 (Kokapet)", "Trumpet Expressway"],
        exitOpportunities: ["High premium rental yields", "Luxury resale market", "Corporate leasing"],
        bestFor: "HNI investors looking for blue-chip assets with immediate rental potential"
      },
      {
        name: isHyderabad ? "Kompally Corridor" : "North Residential Hub",
        area: isHyderabad ? "North Hyderabad" : "Residential Belt",
        matchScore: 89,
        riskLevel: "LOW" as const,
        appreciationMin: 11,
        appreciationMax: 14,
        reasons: [
          "Active, mature residential market with immediate occupancy options.",
          "Excellent lifestyle infrastructure including top schools, hospitals, and entertainment hubs.",
          "Upcoming metro expansion connecting to central business districts."
        ],
        infraHighlights: ["Kompally Junction Flyover", "MMTS Gundlapochampally", "NH-44 Expansion"],
        exitOpportunities: ["Family home resale", "Ready-to-occupy rentals", "Villa leasing"],
        bestFor: "Investors seeking low-risk, family-centric residential investments"
      }
    ];
  }

  const overallRiskScore = budget <= 40 ? 7 : budget <= 100 ? 5 : 3;

  return {
    executiveSummary: `Based on your budget of ₹${budget} Lakhs and a horizon of ${horizon} years, your profile leans toward ${budget <= 40 ? "opportunistic growth in high-potential open plots" : budget <= 100 ? "balanced appreciation in upcoming industrial and tech corridors" : "stable wealth preservation in premium commercial and residential zones"} in ${city}. We recommend focusing on corridors with active infrastructure execution.`,
    corridors,
    overallRiskScore,
    riskRationale: budget <= 40 
      ? "Higher risk due to longer timelines for infrastructural maturity in greenfield plotting corridors like Yadadri." 
      : "Low-to-medium risk profile as investments are placed near active IT hubs and industrial clusters with high employee counts.",
    marketOutlook: `${city}'s real estate market remains resilient, with West and South growth vectors showing strong infrastructure-led capital gains.`,
    disclaimer: "Disclaimer: Real estate investments are subject to market risks. Please verify all developer permissions and RERA numbers before committing funds."
  };
}

export async function getInvestmentRecommendations(budget: number, horizon: number, city: string) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey || apiKey === "mock-anthropic-key-for-local-testing" || apiKey.trim() === "") {
    console.log("Using Mock AI Recommendations (Anthropic API Key not set/mocked)");
    // Small artificial delay to mock network request
    await new Promise((resolve) => setTimeout(resolve, 2000));
    return getMockRecommendation(budget, horizon, city);
  }

  try {
    let infraContext = "";
    if (city.toLowerCase() === "hyderabad") {
      try {
        const projects = await prisma.infraProject.findMany({
          where: { isPublished: true },
          take: 8
        });
        const approvals = await prisma.approvalRecord.findMany({
          where: { isPublished: true },
          orderBy: { approvalDate: "desc" },
          take: 6
        });
        const scores = await prisma.corridorIntelligence.findMany();

        infraContext = `
Additional infrastructure context for Hyderabad:

Active Infrastructure Projects:
${projects.map(p => `- ${p.name} (${p.shortName}): Status: ${p.status}, Completion: ${p.completionPct}%, Affected Corridors: ${p.affectedCorridors.join(", ")}, RE Impact Score: ${p.reImpactScore}/10`).join("\n")}

Recent layout approvals:
${approvals.map(a => `- ${a.projectName} (${a.authority}): Type: ${a.approvalType}, Corridor: ${a.corridor || "N/A"}, Status: ${a.status}`).join("\n")}

Corridor Intelligence Ratings:
${scores.map(s => `- ${s.corridor}: Overall Score: ${s.overallScore}/100, Sentiment: ${s.investorSentiment}, Key Drivers: ${s.keyDrivers.slice(0, 2).join(", ")}`).join("\n")}
        `;
      } catch (dbErr) {
        console.error("Failed to query DB for AI recommendations context", dbErr);
      }
    }

    const anthropic = new Anthropic({ apiKey });
    const systemPrompt = `You are an expert real estate investment advisor specializing in Indian real estate markets, particularly Hyderabad and Telangana. You provide data-driven, corridor-specific investment recommendations. Always respond in valid JSON only, no markdown.`;
    
    const userPrompt = `A client wants real estate investment advice with these parameters:

Budget: ₹${budget} Lakhs
Investment Horizon: ${horizon} years
Preferred City: ${city}

${infraContext}

Respond with a JSON object in this exact structure:
{
"executiveSummary": "string — 2-3 sentences summarizing the investment profile and opportunity",
"corridors": [
{
"name": "string — corridor name",
"area": "string — specific area/zone",
"matchScore": number (0-100),
"riskLevel": "LOW" | "MEDIUM" | "HIGH",
"appreciationMin": number (percentage),
"appreciationMax": number (percentage),
"reasons": ["string", "string", "string"],
"infraHighlights": ["string", "string"],
"exitOpportunities": ["string", "string"],
"bestFor": "string — type of investor this suits"
}
],
"overallRiskScore": number (1-10),
"riskRationale": "string",
"marketOutlook": "string — 1-2 sentences on market conditions",
"disclaimer": "string — standard investment disclaimer"
}
Return 2-4 corridor recommendations ordered by match score descending.`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const content = response.content[0].type === "text" ? response.content[0].text : "";
    
    // Parse response
    const jsonStart = content.indexOf("{");
    const jsonEnd = content.lastIndexOf("}");
    if (jsonStart !== -1 && jsonEnd !== -1) {
      const jsonStr = content.substring(jsonStart, jsonEnd + 1);
      return JSON.parse(jsonStr);
    }
    
    throw new Error("Invalid response format from Claude");
  } catch (error) {
    console.error("Error calling Anthropic API:", error);
    // Return mock on failure in dev environment
    console.log("Falling back to local recommendations engine");
    return getMockRecommendation(budget, horizon, city);
  }
}
