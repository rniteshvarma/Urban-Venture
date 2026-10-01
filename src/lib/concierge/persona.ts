/**
 * Map a buyer profile to one of the twelve personas. Deterministic and
 * explainable: the rules read purpose, property type, budget, horizon and
 * NRI status — the things the concierge asks for — in priority order.
 */
import type { BuyerPersona, BuyPurpose, ListingPropertyType } from "@prisma/client";
import { COMMERCIAL_TYPES, PERSONA_META } from "../personas";

export interface BuyerProfile {
  purpose?: BuyPurpose | null;
  types?: ListingPropertyType[];
  budgetMinLakh?: number | null;
  budgetMaxLakh?: number | null;
  horizonYears?: number | null;
  timeline?: string | null;
  isNri?: boolean;
  requirements?: string | null;
}

export interface PersonaResult {
  persona: BuyerPersona;
  score: number; // confidence 0-100
  reason: string;
}

const has = (types: ListingPropertyType[], ...t: ListingPropertyType[]) => t.some((x) => types.includes(x));

export function classifyProfile(p: BuyerProfile): PersonaResult {
  const types = p.types ?? [];
  const budget = p.budgetMaxLakh ?? p.budgetMinLakh ?? null;
  const invest = p.purpose === "INVESTMENT" || p.purpose === "BOTH";
  const ownUse = p.purpose === "OWN_USE" || p.purpose === "BOTH";
  const req = (p.requirements ?? "").toLowerCase();
  const r = (persona: BuyerPersona, score: number, why: string): PersonaResult => ({
    persona,
    score,
    reason: `${PERSONA_META[persona].label}: ${why}`,
  });

  if (has(types, ...COMMERCIAL_TYPES)) {
    return r("COMMERCIAL_INVESTOR", 88, `looking at ${types.filter((t) => COMMERCIAL_TYPES.includes(t)).map((t) => t.toLowerCase().replace(/_/g, " ")).join(" / ")}${p.purpose === "OWN_USE" ? " for their own business" : " for yield and appreciation"}.`);
  }
  if (has(types, "FARM_LAND")) return r("FARMLAND_LIFESTYLE", 88, "wants farm land — lifestyle and long-term land value.");
  if (/\b(retire|retirement|old age|pension)\b/.test(req)) return r("RETIREMENT_PLANNER", 85, "mentioned retirement; wants stable, low-risk assets.");
  if (p.isNri && p.purpose !== "OWN_USE") return r("NRI_INVESTOR", 85, `messaging from outside India and buying ${invest ? "as an investment" : "in Hyderabad"}.`);
  if (invest && budget !== null && budget >= 150) return r("HNI_PORTFOLIO_BUILDER", 82, `budget of ₹${budget >= 100 ? `${+(budget / 100).toFixed(2)} Cr` : `${budget}L`} for investment.`);

  if (invest && (has(types, "APARTMENT", "COMMERCIAL_SPACE") || /\b(rent|rental|tenant|yield|income)\b/.test(req)) && p.purpose !== "BOTH") {
    return r("RENTAL_INCOME_SEEKER", 80, "buying to let — rental income matters more than resale.");
  }
  if (p.purpose === "INVESTMENT" && has(types, "VILLA", "INDEPENDENT_HOUSE")) {
    return r("RENTAL_INCOME_SEEKER", 72, "investing in a built home — rental income plus appreciation.");
  }
  if (invest && (types.length === 0 || has(types, "OPEN_PLOT", "VILLA_PLOT"))) {
    if (p.horizonYears != null && p.horizonYears <= 3) return r("LAND_SPECULATOR", 82, `short ${p.horizonYears}-year hold, chasing appreciation.`);
    if (p.purpose === "INVESTMENT") return r("LAND_BANKER", 80, `holding land ${p.horizonYears ? `for ~${p.horizonYears} years` : "for the long term"} ahead of growth.`);
  }

  if (ownUse) {
    if (has(types, "OPEN_PLOT", "VILLA_PLOT")) return r("SELF_BUILD_HOMEOWNER", 82, "buying a plot to build their own home.");
    if (has(types, "VILLA", "INDEPENDENT_HOUSE") && (budget === null || budget >= 80)) return r("FAMILY_UPGRADER", 80, "moving to a bigger home — villa or independent house.");
    if (budget !== null && budget < 40) return r("FIRST_TIME_BUYER", 80, `own-use buyer with a budget under ₹40L.`);
    return r("PROFESSIONAL_FIRST_HOME", 72, "own-use home buyer in the mid budget band.");
  }

  // Investment without a clear type signal, or nothing specified yet.
  if (budget !== null && budget < 40) return r("FIRST_TIME_BUYER", 60, "modest budget; first property purchase is likely.");
  if (invest) return r("LAND_BANKER", 60, "investing without a strong type preference — land is the usual fit.");
  return r("PROFESSIONAL_FIRST_HOME", 50, "not enough detail yet for a sharper persona.");
}
