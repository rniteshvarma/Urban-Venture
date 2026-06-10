import Anthropic from "@anthropic-ai/sdk";
import { BuyerPersona, Lead } from "@prisma/client";
import prisma from "./prisma";

// Local heuristics classifier to use when Claude API is mocked
function heuristicsClassification(lead: any): { persona: BuyerPersona; score: number; reason: string } {
  const budget = lead.budget;
  const horizon = lead.horizon;
  const city = lead.city?.toLowerCase() || "";
  const notes = lead.notes?.toLowerCase() || "";

  // 1. Speculator (short horizon 1-3 years)
  if (horizon <= 3 || notes.includes("speculat") || notes.includes("quick") || notes.includes("appreciation")) {
    return {
      persona: BuyerPersona.LAND_SPECULATOR,
      score: 85,
      reason: "Classified as Land Speculator due to short investment horizon (1-3 years) and appetite for fast capital appreciation."
    };
  }
  // 2. HNI (budget >= 1Cr)
  if (budget >= 100 || notes.includes("hni") || notes.includes("multiple")) {
    return {
      persona: BuyerPersona.HNI_PORTFOLIO_BUILDER,
      score: 90,
      reason: "Classified as HNI Portfolio Builder based on a premium budget size above ₹1 Crore, suitable for diverse corridor preservation."
    };
  }
  // 3. NRI (budget >= 50L, interested in Hyderabad/abroad keywords)
  if (budget >= 50 && (city.includes("hyderabad") || notes.includes("nri") || notes.includes("abroad"))) {
    return {
      persona: BuyerPersona.NRI_INVESTOR,
      score: 80,
      reason: "Classified as NRI Investor due to an above-average budget, long-term horizon, and focus on premium developments in Hyderabad."
    };
  }
  // 4. First time buyer (budget < 30L)
  if (budget < 30) {
    return {
      persona: BuyerPersona.FIRST_TIME_BUYER,
      score: 85,
      reason: "Classified as First-Time Buyer because the investment amount is under ₹30 Lakhs, aligning with affordable residential plots."
    };
  }
  // 5. Retirement planner (budget 20-60L, horizon 7-10 years)
  if (budget >= 20 && budget <= 60 && horizon >= 7) {
    return {
      persona: BuyerPersona.RETIREMENT_PLANNER,
      score: 75,
      reason: "Classified as Retirement Planner based on a long-term investment horizon (7+ years) and low-to-moderate target budget."
    };
  }
  // 6. Professional first home (budget 30-80L, horizon 3-7 years)
  return {
    persona: BuyerPersona.PROFESSIONAL_FIRST_HOME,
    score: 75,
    reason: "Classified as Professional First Home based on typical salaried professional budget (₹30-80L) and mid-term horizon."
  };
}

// Persona classification engine
export async function classifyLeadPersona(leadId: string): Promise<{
  persona: BuyerPersona;
  score: number;
  reason: string;
} | null> {
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

  if (!lead) return null;

  const searchCount = lead.user?.searches?.length || 0;
  const apiKey = process.env.ANTHROPIC_API_KEY;

  let result: { persona: BuyerPersona; score: number; reason: string };

  if (!apiKey || apiKey === "mock-anthropic-key-for-local-testing" || apiKey.trim() === "") {
    // Heuristics fallback
    result = heuristicsClassification(lead);
  } else {
    try {
      const anthropic = new Anthropic({ apiKey });
      const prompt = `
You are a real estate buyer persona classifier for the Indian market, specializing in Hyderabad/Telangana.

Classify this lead into exactly ONE persona from this list:
- FIRST_TIME_BUYER: Budget under ₹30L, horizon 3-5 years, looking for first home or small investment
- NRI_INVESTOR: Budget above ₹50L, interested in Hyderabad specifically, longer horizon 5-10 years
- LAND_SPECULATOR: Any budget, short horizon 1-3 years, high risk tolerance, wants quick appreciation
- RETIREMENT_PLANNER: Budget ₹20-60L, long horizon 7-10 years, wants stable low-risk assets
- HNI_PORTFOLIO_BUILDER: Budget above ₹1Cr, possibly multiple inquiries, wants diversified corridors
- PROFESSIONAL_FIRST_HOME: Budget ₹30-80L, horizon 3-7 years, salaried professional (IT/medical/government)

Lead data:
- Budget: ₹${lead.budget} Lakhs
- Investment Horizon: ${lead.horizon} years
- City: ${lead.city}
- Number of AI searches done: ${searchCount}
- Notes/context: ${lead.notes || 'none'}

Respond ONLY in this JSON format:
{
  "persona": "PERSONA_KEY",
  "score": <confidence 0-100>,
  "reason": "2-sentence explanation of why this persona was chosen"
}`;

      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: "You are a lead persona classifier. Always output valid JSON only, no markdown, no conversational text.",
        messages: [{ role: "user", content: prompt }]
      });

      const content = response.content[0].type === "text" ? response.content[0].text : "";
      
      const jsonStart = content.indexOf("{");
      const jsonEnd = content.lastIndexOf("}");
      if (jsonStart !== -1 && jsonEnd !== -1) {
        const jsonStr = content.substring(jsonStart, jsonEnd + 1);
        const parsed = JSON.parse(jsonStr);
        result = {
          persona: parsed.persona as BuyerPersona,
          score: Number(parsed.score),
          reason: parsed.reason
        };
      } else {
        throw new Error("Invalid format from Claude");
      }
    } catch (err) {
      console.error("Claude Persona classification failed, falling back to heuristics:", err);
      result = heuristicsClassification(lead);
    }
  }

  // Update Lead in database
  await prisma.lead.update({
    where: { id: leadId },
    data: {
      persona: result.persona,
      personaScore: result.score,
      personaReason: result.reason,
      personaUpdatedAt: new Date()
    }
  });

  return result;
}
