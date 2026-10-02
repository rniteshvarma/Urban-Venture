/**
 * Rank listed properties for a buyer and give each a Property Tiger rating.
 *
 *   fit (0–100): type 30 · budget 25 · area 20 · purpose 10 · horizon/timeline 10 · persona 5
 *   rating (/10): 70% fit + 30% the corridor's intelligence score, less a
 *                 point if the listing's risk doesn't suit the persona.
 *
 * Every reason and watch-out is built from stored facts — nothing invented.
 */
import type { BuyerPersona, ListingPropertyType, RiskLevel } from "@prisma/client";
import prisma from "../prisma";
import { LISTING_TYPE_LABELS, PERSONA_META, listingTypesFromText, suggestPersonasForListing } from "../personas";
import type { BuyerProfile } from "./persona";
import { describeType, formatBudget } from "./engine";
import { parseAreas } from "./parse";

export interface ProjectCand {
  id: string;
  name: string;
  developer: string;
  corridor: string;
  corridorSlug: string | null;
  propertyType: string;
  listingTypes: ListingPropertyType[];
  purposes: string[];
  targetPersonas: BuyerPersona[];
  minBudgetLakhs: number;
  maxBudgetLakhs: number;
  minHorizonYears: number;
  maxHorizonYears: number;
  riskLevel: RiskLevel;
  possessionDate: Date | null;
  reraNumber: string | null;
  expectedRentalYieldPct: number | null;
}

export interface CorridorCand {
  slug: string;
  shortName: string;
  direction: string | null;
  overallScore: number | null;
  keyDrivers: string[];
  keyRisks: string[];
  forecast5yrMin: number | null;
  forecast5yrMax: number | null;
  plotPriceMidSqYd: number | null;
  bestHorizonYearsMin: number | null;
  bestHorizonYearsMax: number | null;
  riskLevel: RiskLevel;
}

export interface RankedMatch {
  project: ProjectCand;
  fit: number;
  exactType: boolean; // the listing is a type they asked for (or they didn't specify)
  rating: number; // 1.0–9.8
  reasons: string[]; // ≤3, strongest first
  watchOut: string | null;
  corridorName: string | null;
}

export interface MatchProfile extends BuyerProfile {
  areas?: string[];
  persona?: BuyerPersona | null;
}

const RELATED: Array<[ListingPropertyType, ListingPropertyType]> = [
  ["OPEN_PLOT", "VILLA_PLOT"],
  ["VILLA", "INDEPENDENT_HOUSE"],
  ["COMMERCIAL_PLOT", "COMMERCIAL_SPACE"],
  ["OPEN_PLOT", "FARM_LAND"],
  ["VILLA_PLOT", "VILLA"], // someone building a villa will often consider a ready one
];
const related = (a: ListingPropertyType, b: ListingPropertyType) => RELATED.some(([x, y]) => (x === a && y === b) || (x === b && y === a));

const lakh = (v: number) => (v >= 100 ? `₹${+(v / 100).toFixed(2)} Cr` : `₹${Math.round(v)}L`);

export function scoreProject(p: ProjectCand, prof: MatchProfile, corridors: Map<string, CorridorCand>, now = new Date()): RankedMatch {
  const plus: Array<[number, string]> = [];
  const minus: string[] = [];
  let fit = 0;
  const corridor = p.corridorSlug ? corridors.get(p.corridorSlug) ?? null : null;
  const pTypes = p.listingTypes.length ? p.listingTypes : listingTypesFromText(p.propertyType);
  const wanted = prof.types ?? [];
  const exactType = !wanted.length || pTypes.some((t) => wanted.includes(t));

  // Type (30)
  if (!wanted.length) fit += 18;
  else if (pTypes.some((t) => wanted.includes(t))) {
    fit += 30;
    plus.push([30, `${LISTING_TYPE_LABELS[pTypes.find((t) => wanted.includes(t))!]} — exactly the type you asked for`]);
  } else if (pTypes.some((t) => wanted.some((w) => related(t, w)))) {
    fit += 15;
    minus.push(`${pTypes.map((t) => LISTING_TYPE_LABELS[t]).join(" / ")} rather than ${wanted.map((t) => LISTING_TYPE_LABELS[t].toLowerCase()).join(" / ")}`);
  } else {
    minus.push(`Different property type (${pTypes.map((t) => LISTING_TYPE_LABELS[t].toLowerCase()).join(" / ") || p.propertyType})`);
  }

  // Budget (25)
  const bMax = prof.budgetMaxLakh ?? null;
  const bMin = prof.budgetMinLakh ?? 0;
  if (bMax === null) fit += 15;
  else if (p.minBudgetLakhs <= bMax && p.maxBudgetLakhs >= bMin) {
    fit += 25;
    plus.push([25, `Priced ${lakh(p.minBudgetLakhs)}–${lakh(p.maxBudgetLakhs)}, within your ${formatBudget(prof.budgetMinLakh, bMax)} range`]);
  } else if (p.minBudgetLakhs <= bMax * 1.2 && p.minBudgetLakhs > bMax) {
    fit += 12;
    minus.push(`Entry price ${lakh(p.minBudgetLakhs)} is ~${Math.round((p.minBudgetLakhs / bMax - 1) * 100)}% above your budget`);
  } else if (p.maxBudgetLakhs < bMin) {
    fit += 10;
    plus.push([8, `Comfortably under budget — from ${lakh(p.minBudgetLakhs)}`]);
  } else {
    minus.push(`Priced ${lakh(p.minBudgetLakhs)}–${lakh(p.maxBudgetLakhs)}, outside your budget`);
  }

  // Area (20)
  const areas = prof.areas ?? [];
  if (!areas.length) fit += 14;
  else if (p.corridorSlug && areas.includes(p.corridorSlug)) {
    fit += 20;
    plus.push([20, `In ${corridor?.shortName ?? p.corridor}, the area you chose`]);
  } else {
    const dirs = new Set(areas.map((a) => corridors.get(a)?.direction).filter(Boolean));
    if (corridor?.direction && dirs.has(corridor.direction)) {
      fit += 10;
      minus.push(`In ${corridor.shortName} — nearby, but not the area you picked`);
    } else {
      fit += 3;
      minus.push(`In ${corridor?.shortName ?? p.corridor}, away from your preferred area`);
    }
  }

  // Purpose (10)
  if (!prof.purpose || !p.purposes.length) fit += 7;
  else if (prof.purpose === "BOTH" || p.purposes.includes(prof.purpose) || p.purposes.includes("BOTH")) fit += 10;
  else {
    fit += 2;
    minus.push(prof.purpose === "OWN_USE" ? "Positioned as an investment rather than a home to live in" : "Positioned for end-users rather than investors");
  }

  // Horizon / timeline (10)
  if (prof.purpose === "OWN_USE" && prof.timeline) {
    const ready = !p.possessionDate || p.possessionDate <= now;
    if (prof.timeline === "READY" && !ready) {
      fit += 3;
      minus.push(`Possession ${p.possessionDate!.toLocaleDateString("en-IN", { month: "short", year: "numeric" })} — not ready to move in yet`);
    } else fit += 10;
  } else if (prof.horizonYears) {
    const h = prof.horizonYears;
    if (h >= p.minHorizonYears && h <= p.maxHorizonYears) {
      fit += 10;
      plus.push([10, `Suits your ~${h}-year hold`]);
    } else if (Math.abs(h - p.minHorizonYears) <= 1 || Math.abs(h - p.maxHorizonYears) <= 1) fit += 6;
    else {
      fit += 2;
      minus.push(`Best held ${p.minHorizonYears}–${p.maxHorizonYears} years; you plan ~${h}`);
    }
  } else fit += 6;

  // Persona (5)
  const targets = p.targetPersonas.length
    ? p.targetPersonas
    : suggestPersonasForListing({ listingTypes: pTypes, purposes: p.purposes as never, minBudgetLakhs: p.minBudgetLakhs, maxBudgetLakhs: p.maxBudgetLakhs, riskLevel: p.riskLevel });
  if (prof.persona && targets.includes(prof.persona)) fit += 5;
  else if (!prof.persona) fit += 3;

  // Corridor facts (grounded upside)
  if (corridor?.forecast5yrMin != null && corridor.forecast5yrMax != null) {
    plus.push([9, `${corridor.shortName} is forecast +${Math.round(corridor.forecast5yrMin)}–${Math.round(corridor.forecast5yrMax)}% over 5 years`]);
  }
  if (corridor?.keyDrivers?.[0]) plus.push([7, `Growth driver: ${corridor.keyDrivers[0]}`]);
  if (prof.purpose !== "OWN_USE" && p.expectedRentalYieldPct) plus.push([8, `Expected rental yield ~${p.expectedRentalYieldPct}%`]);
  if (p.reraNumber) plus.push([6, "RERA registered"]);

  // Rating
  const personaRisk = prof.persona ? PERSONA_META[prof.persona].riskLevels : null;
  const riskPenalty = personaRisk && !personaRisk.includes(p.riskLevel) ? 10 : 0;
  if (riskPenalty) minus.push(`${p.riskLevel === "HIGH" ? "Higher" : "Different"}-risk profile than suits a ${PERSONA_META[prof.persona!].short.toLowerCase()}`);
  const corridorScore = corridor?.overallScore ?? 60;
  const rating = Math.min(9.8, Math.max(1, Math.round((0.7 * fit + 0.3 * corridorScore - riskPenalty)) / 10));

  const watchOut = minus[0] ?? corridor?.keyRisks?.[0] ?? (p.riskLevel === "HIGH" ? "Higher-risk corridor — suits a longer hold" : null);
  return {
    project: p,
    fit: Math.round(fit),
    exactType,
    rating: Math.round(rating * 10) / 10,
    reasons: plus.sort((a, b) => b[0] - a[0]).slice(0, 3).map(([, r]) => r),
    watchOut,
    corridorName: corridor?.shortName ?? null,
  };
}

/**
 * Ranked matches: good fits first; if none clear the bar, the closest options
 * (flagged) and `gap`, which says in the buyer's terms what is missing.
 */
export function rankProjects(
  projects: ProjectCand[],
  prof: MatchProfile,
  corridors: CorridorCand[],
  limit = 3,
): { matches: RankedMatch[]; closestOnly: boolean; gap: string | null } {
  const bySlug = new Map(corridors.map((c) => [c.slug, c]));
  const scored = projects.map((p) => scoreProject(p, prof, bySlug)).sort((a, b) => b.rating - a.rating || b.fit - a.fit);
  const areas = prof.areas ?? [];
  const inArea = (m: RankedMatch) => !areas.length || (m.project.corridorSlug != null && areas.includes(m.project.corridorSlug));
  // Entry price at most ~20% over budget (the scorer already flags that stretch).
  const affordable = (m: RankedMatch) => prof.budgetMaxLakh == null || m.project.minBudgetLakhs <= prof.budgetMaxLakh * 1.2;
  // A "match" must be the type they asked for, affordable and, when they picked
  // areas, in one of them; anything else is only ever offered as a closest option.
  const good = scored.filter((m) => m.fit >= 60 && m.exactType && affordable(m) && inArea(m));
  if (good.length) return { matches: good.slice(0, limit), closestOnly: false, gap: null };
  // Lead with the best listing in their area (if any), then the best elsewhere.
  const nearestInArea = areas.length ? scored.find(inArea) : undefined;
  const closest = [...(nearestInArea ? [nearestInArea] : []), ...scored.filter((m) => m !== nearestInArea)].slice(0, Math.min(2, limit));
  return { matches: closest, closestOnly: true, gap: describeGap(scored, prof, bySlug, inArea) };
}

/** Why nothing qualified, e.g. "We don't have an open plot listed in Kokapet yet". */
function describeGap(scored: RankedMatch[], prof: MatchProfile, bySlug: Map<string, CorridorCand>, inArea: (m: RankedMatch) => boolean): string | null {
  const areas = prof.areas ?? [];
  if (!areas.length) return null;
  const where = areas.map((a) => bySlug.get(a)?.shortName ?? a).join(" or ");
  const what = describeType(prof.types);
  const a = /^[aeiou]/i.test(what) ? "an" : "a";
  const sameType = scored.filter((m) => inArea(m) && m.exactType);
  if (!sameType.length) return `We don't have ${a} ${what} listed in ${where} yet`;
  const bMin = prof.budgetMinLakh ?? 0;
  const bMax = prof.budgetMaxLakh ?? null;
  const inBudget = (m: RankedMatch) => bMax === null || (m.project.minBudgetLakhs <= bMax && m.project.maxBudgetLakhs >= bMin);
  if (!sameType.some(inBudget)) return `No ${what} in ${where} fits ${formatBudget(prof.budgetMinLakh, bMax)} yet`;
  return `Nothing in ${where} fits every detail yet`;
}

/** The best corridors for this buyer — used when they asked us to suggest, or nothing listed fits. */
export function pickAreas(prof: MatchProfile, corridors: CorridorCand[], limit = 2): CorridorCand[] {
  const land = !prof.types?.length || prof.types.some((t) => ["OPEN_PLOT", "VILLA_PLOT", "FARM_LAND"].includes(t));
  const budget = prof.budgetMaxLakh ?? null;
  const risk = prof.persona ? PERSONA_META[prof.persona].riskLevels : null;
  return corridors
    .map((c) => {
      let s = c.overallScore ?? 50;
      if (prof.areas?.includes(c.slug)) s += 25;
      // A 150 sq.yd plot should be affordable at the corridor's mid rate.
      if (land && budget && c.plotPriceMidSqYd) s += (c.plotPriceMidSqYd * 150) / 100000 <= budget ? 10 : -25;
      if (prof.horizonYears && c.bestHorizonYearsMin != null && c.bestHorizonYearsMax != null) {
        s += prof.horizonYears >= c.bestHorizonYearsMin && prof.horizonYears <= c.bestHorizonYearsMax ? 8 : -5;
      }
      if (risk && !risk.includes(c.riskLevel)) s -= 10;
      return { c, s };
    })
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((x) => x.c);
}

// ── Database loaders ─────────────────────────────────────────────────────
export async function loadCandidates(): Promise<{ projects: ProjectCand[]; corridors: CorridorCand[] }> {
  const [rows, corridorRows] = await Promise.all([
    prisma.project.findMany({
      where: { status: "ACTIVE", listingStatus: "APPROVED", reviewState: "PUBLISHED" },
      select: {
        id: true, name: true, developer: true, corridor: true, propertyType: true, listingTypes: true, purposes: true, targetPersonas: true,
        minBudgetLakhs: true, maxBudgetLakhs: true, minHorizonYears: true, maxHorizonYears: true, riskLevel: true,
        possessionDate: true, reraNumber: true, expectedRentalYieldPct: true,
      },
      orderBy: { id: "asc" }, // every eligible listing, in a stable order
    }),
    prisma.corridorProfile.findMany({
      select: {
        slug: true, name: true, shortName: true, direction: true, overallScore: true, keyDrivers: true, keyRisks: true,
        forecast5yrMin: true, forecast5yrMax: true, plotPriceMidSqYd: true, bestHorizonYearsMin: true, bestHorizonYearsMax: true,
        riskLevel: true, subAreas: true,
      },
    }),
  ]);
  // Project.corridor is free text ("Shamshabad / Aerospace SEZ", "Pharma City Influence Zone").
  // Few distinct values across hundreds of listings, so resolve each once.
  const slugByText = new Map<string, string | null>();
  const slugFor = (text: string): string | null => {
    if (!slugByText.has(text)) slugByText.set(text, parseAreas(text, corridorRows)?.slugs[0] ?? null);
    return slugByText.get(text)!;
  };
  return {
    projects: rows.map((p) => ({ ...p, corridorSlug: slugFor(p.corridor), purposes: p.purposes as string[] })),
    corridors: corridorRows.map((c) => ({ ...c, direction: c.direction as string | null })),
  };
}
