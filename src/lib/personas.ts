/**
 * Buyer personas and property vocabulary — the single source for labels,
 * colours and matching defaults. Client-safe (no database access): the CRM
 * lists, the classifier and the PersonaConfig seed all read from here.
 */
import type { BuyerPersona, BuyPurpose, ListingPropertyType, RiskLevel } from "@prisma/client";

export interface PersonaMeta {
  label: string;
  short: string; // badge-sized label
  icon: string;
  color: string; // hex, for inline styles
  tw: { bg: string; text: string; border: string }; // Tailwind badge classes
  description: string;
  riskLevels: RiskLevel[];
  minBudgetLakhs: number | null;
  maxBudgetLakhs: number | null;
  minHorizon: number | null;
  maxHorizon: number | null;
}

export const PERSONA_META: Record<BuyerPersona, PersonaMeta> = {
  FIRST_TIME_BUYER: {
    label: "First-Time Buyer", short: "First-Time Buyer", icon: "🏠", color: "#3B82F6",
    tw: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-100" },
    description: "Budget under ₹40L, first property — value and safety over upside.",
    riskLevels: ["LOW", "MEDIUM"], minBudgetLakhs: null, maxBudgetLakhs: 40, minHorizon: 3, maxHorizon: 7,
  },
  NRI_INVESTOR: {
    label: "NRI Investor", short: "NRI Investor", icon: "✈️", color: "#8B5CF6",
    tw: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-100" },
    description: "Buying from abroad — needs clear titles, low hassle and remote-friendly developers.",
    riskLevels: ["LOW", "MEDIUM"], minBudgetLakhs: 40, maxBudgetLakhs: null, minHorizon: 5, maxHorizon: 10,
  },
  LAND_SPECULATOR: {
    label: "Land Speculator", short: "Land Speculator", icon: "📈", color: "#E11D48",
    tw: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-100" },
    description: "Short hold (1–3 years), chasing appreciation from upcoming infrastructure.",
    riskLevels: ["MEDIUM", "HIGH"], minBudgetLakhs: null, maxBudgetLakhs: null, minHorizon: 1, maxHorizon: 3,
  },
  RETIREMENT_PLANNER: {
    label: "Retirement Planner", short: "Retirement Planner", icon: "🌿", color: "#10B981",
    tw: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-100" },
    description: "Stable, low-risk assets for later life — ready homes or safe land.",
    riskLevels: ["LOW"], minBudgetLakhs: 20, maxBudgetLakhs: 80, minHorizon: 5, maxHorizon: 15,
  },
  HNI_PORTFOLIO_BUILDER: {
    label: "HNI Portfolio Builder", short: "HNI Portfolio", icon: "💼", color: "#F59E0B",
    tw: { bg: "bg-amber-50", text: "text-amber-800", border: "border-amber-100" },
    description: "₹1.5Cr+ spread across corridors and asset types.",
    riskLevels: ["LOW", "MEDIUM", "HIGH"], minBudgetLakhs: 150, maxBudgetLakhs: null, minHorizon: 3, maxHorizon: 10,
  },
  PROFESSIONAL_FIRST_HOME: {
    label: "Professional First Home", short: "Professional Home", icon: "💻", color: "#06B6D4",
    tw: { bg: "bg-cyan-50", text: "text-cyan-700", border: "border-cyan-100" },
    description: "Salaried professional buying a home near work, ₹40L–₹1Cr.",
    riskLevels: ["LOW"], minBudgetLakhs: 40, maxBudgetLakhs: 100, minHorizon: 3, maxHorizon: 10,
  },
  COMMERCIAL_INVESTOR: {
    label: "Commercial Investor", short: "Commercial", icon: "🏢", color: "#0EA5E9",
    tw: { bg: "bg-sky-50", text: "text-sky-700", border: "border-sky-100" },
    description: "Commercial plots, shops or offices — for rental yield or their own business.",
    riskLevels: ["MEDIUM", "HIGH"], minBudgetLakhs: 50, maxBudgetLakhs: null, minHorizon: 3, maxHorizon: 10,
  },
  RENTAL_INCOME_SEEKER: {
    label: "Rental Income Seeker", short: "Rental Income", icon: "🔑", color: "#14B8A6",
    tw: { bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-100" },
    description: "Buys to let — apartments or commercial space where tenants are easy to find.",
    riskLevels: ["LOW", "MEDIUM"], minBudgetLakhs: 30, maxBudgetLakhs: 200, minHorizon: 5, maxHorizon: 15,
  },
  FARMLAND_LIFESTYLE: {
    label: "Farm Land & Lifestyle", short: "Farm Land", icon: "🌾", color: "#65A30D",
    tw: { bg: "bg-lime-50", text: "text-lime-800", border: "border-lime-100" },
    description: "Farm land, weekend homes or agri plots — lifestyle first, appreciation second.",
    riskLevels: ["MEDIUM", "HIGH"], minBudgetLakhs: null, maxBudgetLakhs: null, minHorizon: 5, maxHorizon: 15,
  },
  FAMILY_UPGRADER: {
    label: "Family Upgrader", short: "Family Upgrader", icon: "🏡", color: "#DB2777",
    tw: { bg: "bg-pink-50", text: "text-pink-700", border: "border-pink-100" },
    description: "Moving to a bigger home — villas and independent houses, schools and community matter.",
    riskLevels: ["LOW"], minBudgetLakhs: 80, maxBudgetLakhs: null, minHorizon: 5, maxHorizon: 20,
  },
  SELF_BUILD_HOMEOWNER: {
    label: "Self-Build Homeowner", short: "Self-Build", icon: "🧱", color: "#EA580C",
    tw: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-100" },
    description: "Buys a plot to build their own house — approvals and a buildable layout come first.",
    riskLevels: ["LOW", "MEDIUM"], minBudgetLakhs: 20, maxBudgetLakhs: 150, minHorizon: 2, maxHorizon: 10,
  },
  LAND_BANKER: {
    label: "Land Banker", short: "Land Banker", icon: "🏦", color: "#7C3AED",
    tw: { bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-100" },
    description: "Patient capital — open plots held 5+ years ahead of the growth curve.",
    riskLevels: ["MEDIUM", "HIGH"], minBudgetLakhs: null, maxBudgetLakhs: null, minHorizon: 5, maxHorizon: 15,
  },
};

export const PERSONA_KEYS = Object.keys(PERSONA_META) as BuyerPersona[];

export function personaMeta(p: string | null | undefined): PersonaMeta | null {
  return p && p in PERSONA_META ? PERSONA_META[p as BuyerPersona] : null;
}

export const LISTING_TYPE_LABELS: Record<ListingPropertyType, string> = {
  OPEN_PLOT: "Open plot",
  VILLA_PLOT: "Villa plot",
  VILLA: "Villa",
  APARTMENT: "Apartment",
  INDEPENDENT_HOUSE: "Independent house",
  FARM_LAND: "Farm land",
  COMMERCIAL_PLOT: "Commercial plot",
  COMMERCIAL_SPACE: "Commercial space",
  INDUSTRIAL_LAND: "Industrial land",
};

export const LISTING_TYPES = Object.keys(LISTING_TYPE_LABELS) as ListingPropertyType[];

export const PURPOSE_LABELS: Record<BuyPurpose, string> = {
  INVESTMENT: "Investment",
  OWN_USE: "Own use",
  BOTH: "Both",
};

export const COMMERCIAL_TYPES: ListingPropertyType[] = ["COMMERCIAL_PLOT", "COMMERCIAL_SPACE", "INDUSTRIAL_LAND"];
export const LAND_TYPES: ListingPropertyType[] = ["OPEN_PLOT", "VILLA_PLOT", "FARM_LAND", "COMMERCIAL_PLOT", "INDUSTRIAL_LAND"];

/**
 * Best-effort listing types from the legacy free-text Project.propertyType
 * ("Plots", "Residential", "Villa", "Commercial"…). Used for untagged listings.
 */
export function listingTypesFromText(text: string | null | undefined): ListingPropertyType[] {
  const t = (text ?? "").toLowerCase();
  const out = new Set<ListingPropertyType>();
  if (/villa\s*plot/.test(t)) out.add("VILLA_PLOT");
  else if (/villa/.test(t)) out.add("VILLA");
  if (/farm|agri/.test(t)) out.add("FARM_LAND");
  if (/commercial\s*(plot|land)/.test(t)) out.add("COMMERCIAL_PLOT");
  else if (/commercial|shop|office|retail/.test(t)) out.add("COMMERCIAL_SPACE");
  if (/industrial|warehouse/.test(t)) out.add("INDUSTRIAL_LAND");
  if (/apartment|flat|residential|bhk/.test(t)) out.add("APARTMENT");
  if (/independent|house|duplex/.test(t)) out.add("INDEPENDENT_HOUSE");
  if (/plot/.test(t) && !out.has("VILLA_PLOT") && !out.has("COMMERCIAL_PLOT")) out.add("OPEN_PLOT");
  return [...out];
}

/** Which personas a listing naturally suits — the default for its targetPersonas. */
export function suggestPersonasForListing(l: {
  listingTypes: ListingPropertyType[];
  purposes: BuyPurpose[];
  minBudgetLakhs: number;
  maxBudgetLakhs: number;
  riskLevel?: RiskLevel | null;
}): BuyerPersona[] {
  const types = new Set(l.listingTypes);
  const invest = !l.purposes.length || l.purposes.includes("INVESTMENT") || l.purposes.includes("BOTH");
  const ownUse = !l.purposes.length || l.purposes.includes("OWN_USE") || l.purposes.includes("BOTH");
  const out = new Set<BuyerPersona>();
  if (COMMERCIAL_TYPES.some((t) => types.has(t))) out.add("COMMERCIAL_INVESTOR");
  if (types.has("COMMERCIAL_SPACE") || (types.has("APARTMENT") && invest)) out.add("RENTAL_INCOME_SEEKER");
  if (types.has("FARM_LAND")) out.add("FARMLAND_LIFESTYLE");
  if ((types.has("OPEN_PLOT") || types.has("VILLA_PLOT")) && invest) {
    out.add("LAND_BANKER");
    if (l.riskLevel !== "LOW") out.add("LAND_SPECULATOR");
  }
  if ((types.has("OPEN_PLOT") || types.has("VILLA_PLOT")) && ownUse) out.add("SELF_BUILD_HOMEOWNER");
  if ((types.has("VILLA") || types.has("INDEPENDENT_HOUSE")) && ownUse && l.maxBudgetLakhs >= 80) out.add("FAMILY_UPGRADER");
  if (types.has("APARTMENT") && ownUse) out.add(l.minBudgetLakhs < 40 ? "FIRST_TIME_BUYER" : "PROFESSIONAL_FIRST_HOME");
  if (ownUse && l.riskLevel === "LOW" && l.minBudgetLakhs <= 80) out.add("RETIREMENT_PLANNER");
  if (l.maxBudgetLakhs >= 150) out.add("HNI_PORTFOLIO_BUILDER");
  if (l.minBudgetLakhs >= 40 && l.riskLevel !== "HIGH") out.add("NRI_INVESTOR");
  return [...out];
}
