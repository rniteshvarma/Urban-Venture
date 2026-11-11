import Anthropic from "@anthropic-ai/sdk";
import { BuyerPersona, Lead } from "@prisma/client";
import prisma from "./prisma";
import { classifyProfile } from "./concierge/persona";

// Local heuristics classifier to use when Claude API is mocked
function heuristicsClassification(lead: any): { persona: BuyerPersona; score: number; reason: string } | null {
  // Leads with a captured buyer profile (WhatsApp concierge / CRM edits) use the profile rules.
  if (lead.purpose || lead.wantedTypes?.length) {
    return classifyProfile({
      purpose: lead.purpose,
      types: lead.wantedTypes,
      budgetMinLakh: lead.budgetMinLakh,
      budgetMaxLakh: lead.budget,
      horizonYears: lead.horizon,
      timeline: lead.timeline,
      isNri: lead.isNri,
      requirements: lead.requirements,
    });
  }
  // Unknown stays unknown: a budget or holding period the buyer never gave is
  // not treated as a small one (null <= 3 is true in JavaScript).
  const budget: number | null = lead.budget != null && lead.budget > 0 ? lead.budget : null;
  const horizon: number | null = lead.horizon != null && lead.horizon > 0 ? lead.horizon : null;
  const notes = lead.notes?.toLowerCase() || "";

  // 1. Speculator (short horizon 1-3 years)
  if ((horizon != null && horizon <= 3) || notes.includes("speculat") || notes.includes("quick")) {
    return {
      persona: BuyerPersona.LAND_SPECULATOR,
      score: 85,
      reason: "Classified as Land Speculator due to a short holding period (1-3 years) or a stated wish for a quick resale."
    };
  }
  // 2. HNI (budget >= 1Cr)
  if ((budget != null && budget >= 100) || notes.includes("hni") || notes.includes("multiple")) {
    return {
      persona: BuyerPersona.HNI_PORTFOLIO_BUILDER,
      score: 90,
      reason: "Classified as HNI Portfolio Builder based on a budget above ₹1 Crore or a stated interest in multiple properties."
    };
  }
  // 3. NRI — only when the buyer says so. Buying in Hyderabad with ₹50 L+ does not make someone an NRI.
  if (lead.isNri || /\bnri\b/.test(notes) || notes.includes("abroad")) {
    return {
      persona: BuyerPersona.NRI_INVESTOR,
      score: 80,
      reason: "Classified as NRI Investor because the buyer said they live abroad."
    };
  }
  // Nothing else to go on without a budget.
  if (budget == null) return null;
  // 4. First time buyer (budget < 30L)
  if (budget < 30) {
    return {
      persona: BuyerPersona.FIRST_TIME_BUYER,
      score: 85,
      reason: "Classified as First-Time Buyer because the stated budget is under ₹30 Lakhs."
    };
  }
  // 5. Retirement planner (budget 20-60L, horizon 7-10 years)
  if (budget <= 60 && horizon != null && horizon >= 7) {
    return {
      persona: BuyerPersona.RETIREMENT_PLANNER,
      score: 75,
      reason: "Classified as Retirement Planner based on a long holding period (7+ years) and a low-to-moderate budget."
    };
  }
  // 6. Professional first home (budget 30L+, mid-term horizon)
  return {
    persona: BuyerPersona.PROFESSIONAL_FIRST_HOME,
    score: 75,
    reason: "Classified as Professional First Home based on a stated budget of ₹30 Lakhs or more and no other signal."
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

  let result: { persona: BuyerPersona; score: number; reason: string } | null;

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
- COMMERCIAL_INVESTOR: Wants commercial plots, shops or offices, for yield or their own business
- RENTAL_INCOME_SEEKER: Buys to let (apartments, commercial space); rental income over resale
- FARMLAND_LIFESTYLE: Wants farm land, a weekend home or agri plot
- FAMILY_UPGRADER: Own use, moving to a bigger home (villa / independent house), budget ₹80L+
- SELF_BUILD_HOMEOWNER: Buys a plot to build their own house
- LAND_BANKER: Patient capital, open plots held 5+ years

Lead data:
- Budget: ${lead.budget != null && lead.budget > 0 ? `₹${lead.budget} Lakhs` : "not stated"}
- Investment Horizon: ${lead.horizon != null && lead.horizon > 0 ? `${lead.horizon} years` : "not stated"}
- City: ${lead.city}
- Number of AI searches done: ${searchCount}
- Notes/context: ${lead.notes || 'none'}
- Purpose: ${lead.purpose ?? 'unknown'}; wants: ${(lead.wantedTypes ?? []).join(', ') || 'unknown'}; NRI: ${lead.isNri ? 'yes' : 'no'}; other needs: ${lead.requirements || 'none'}

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

  // Too little is known to classify — leave the persona as it is rather than guess.
  if (!result) return null;

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
