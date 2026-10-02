// Weekly report content assembly — Part 3, "the core logic".
//
// The pure functions here (the fallback ladder, dedup, top-three) take already
// gathered data and are unit-tested in isolation (assemble.test.ts). The async
// `assembleReport` at the bottom is the only DB-touching entry point; it gathers
// inputs (gather.ts) then runs the pure ladder.
//
// Principles enforced here:
//  • Never return an empty report — walk the ladder to ≥6 substantive items.
//  • Never repeat a property within 28 days unless materially changed.
//  • Area intelligence dedups differently — suppress only if the value is
//    unchanged (reporting "unchanged" three weeks running is noise).

import { areaLabel } from "../explore/query";
import { createHash } from "node:crypto";
import type {
  GatheredData, PrefSnapshot, PropertyCand, CorridorSnapshot, RecentItem,
  ReportItemType, ReportContent, MatchedPropertyView, AreaView, TopThreeItem,
  ReportItemOut, AssembledReport,
} from "./types";

const DEDUP_DAYS = 28;

// ── Property-type matching (ReportPropertyType enum ⇄ free-text) ──────
const TYPE_NEEDLES: Record<string, string[]> = {
  PLOT: ["plot"],
  FARM_PLOT: ["farm"],
  AGRICULTURAL_LAND: ["agri"],
  APARTMENT: ["apartment", "flat"],
  VILLA: ["villa"],
  INDEPENDENT_HOUSE: ["independent", "house"],
  COMMERCIAL: ["commercial", "office", "retail"],
  INDUSTRIAL_LAND: ["industrial"],
};
// Related groups for the L2 "related types" relaxation.
const TYPE_GROUPS: string[][] = [
  ["PLOT", "FARM_PLOT", "AGRICULTURAL_LAND", "INDUSTRIAL_LAND"],
  ["APARTMENT", "VILLA", "INDEPENDENT_HOUSE", "COMMERCIAL"],
];

function storedMatchesType(stored: string, enumType: string): boolean {
  const s = (stored || "").toLowerCase();
  // "plot" must not swallow "farm plot" — check farm first.
  if (enumType === "PLOT" && s.includes("farm")) return false;
  return (TYPE_NEEDLES[enumType] ?? []).some((n) => s.includes(n));
}
export function matchesAnyType(stored: string, enumTypes: string[]): boolean {
  if (enumTypes.length === 0) return true; // no type filter = all
  return enumTypes.some((t) => storedMatchesType(stored, t));
}
function relatedTypes(enumTypes: string[]): string[] {
  const out = new Set<string>();
  for (const t of enumTypes) {
    const g = TYPE_GROUPS.find((grp) => grp.includes(t));
    if (g) g.forEach((x) => out.add(x));
  }
  enumTypes.forEach((t) => out.delete(t)); // related = same group, excluding the exact ones
  return [...out];
}

// ── Dedup: material-state signature + entity hash ─────────────────────
/**
 * Bucket a property's material state so the hash changes exactly when a
 * threshold from Part 3.2 is crossed: price ±5% (log base 1.05 band), score
 * ±5 points, status, media-count tier, verification tier.
 */
export function materialSignature(c: PropertyCand): string {
  const priceBand = c.priceLakh > 0 ? Math.round(Math.log(c.priceLakh) / Math.log(1.05)) : 0;
  const scoreBand = c.listingScore != null ? Math.round(c.listingScore / 5) : -1;
  const mediaTier = c.mediaCount >= 9 ? 3 : c.mediaCount >= 6 ? 2 : c.mediaCount >= 3 ? 1 : 0;
  const verified = c.approvalVerified ? 1 : 0;
  return `p${priceBand}|s${scoreBand}|st${c.approvalStatus ?? ""}|m${mediaTier}|v${verified}`;
}

export function entityHash(itemType: ReportItemType, entityId: string, signature: string): string {
  return createHash("sha256").update(`${itemType}|${entityId}|${signature}`).digest("hex").slice(0, 16);
}

/** True when this exact (type, entity, material-state) went out within 28 days. */
export function suppressedByLedger(
  recent: RecentItem[], itemType: ReportItemType, entityId: string, hash: string, now: Date,
): boolean {
  const cutoff = now.getTime() - DEDUP_DAYS * 86_400_000;
  return recent.some(
    (r) => r.itemType === itemType && r.entityId === entityId && r.entityHash === hash && r.includedAt.getTime() >= cutoff,
  );
}

/** Area items suppress only when the value is unchanged vs the LAST time reported (any window). */
function areaValueUnchanged(recent: RecentItem[], itemType: ReportItemType, entityId: string, hash: string): boolean {
  const prior = recent
    .filter((r) => r.itemType === itemType && r.entityId === entityId)
    .sort((a, b) => b.includedAt.getTime() - a.includedAt.getTime())[0];
  return !!prior && prior.entityHash === hash;
}

// ── Weighting (Part 3.3) ──────────────────────────────────────────────
const WEIGHT = {
  PRICE_DROP: 100,
  NEW_EXACT_HIGH: 90, // exact match, score >= 75
  INFRA_MILESTONE: 85,
  AREA_SCORE_MOVE: 80, // >= 4 points
  NEW_APPROVAL: 70,
  NEW_EXACT_ANY: 65,
  AREA_PRICE_MOVE: 60, // >= 3%
  NEAR_MISS_HIGH: 55, // near-miss, score >= 80
  MARKET_STAT: 30,
};

interface Produced {
  item: ReportItemOut;
  weight: number;
  top3: TopThreeItem;
}

const money = (lakh: number) => (lakh >= 100 ? `₹${(lakh / 100).toFixed(2)} Cr` : `₹${Math.round(lakh)} L`);
const rate = (v: number | null, unit: string | null) => (v != null ? `₹${Math.round(v).toLocaleString("en-IN")}/${unit ?? "sq.yd"}` : "");

function gradeFor(score: number | null): string | null {
  if (score == null) return null;
  if (score >= 80) return "A";
  if (score >= 65) return "B";
  if (score >= 50) return "C";
  return "D";
}

function propertyView(c: PropertyCand, areaName: string | null, why: string[], relaxedLabel?: string): MatchedPropertyView {
  const belowModelPct = c.rateValue != null && c.fairValueMidRate != null && c.fairValueMidRate > 0
    ? Math.round(((c.rateValue - c.fairValueMidRate) / c.fairValueMidRate) * 100)
    : null;
  return {
    id: c.id,
    title: c.areaValue ? `${areaLabel(c.areaValue, c.areaUnit)} · ${areaName ?? c.corridorSlug ?? ""}`.trim() : c.name,
    corridorName: areaName,
    priceLakh: c.priceLakh,
    rateValue: c.rateValue,
    rateUnit: c.rateUnit,
    grade: c.listingSource === "ADMIN" ? null : gradeFor(c.listingScore),
    belowModelPct,
    approvalLabel: c.approvalStatus ? c.approvalStatus.replace(/_/g, " ") : null,
    availabilityLabel: null,
    thumb: c.thumb,
    whyMatched: why,
    url: `/projects/${c.id}`,
    ...(relaxedLabel ? { relaxedLabel } : {}),
  };
}

const areaName = (data: GatheredData, slug: string | null): string | null =>
  data.watchedAreas.find((a) => a.slug === slug)?.name ?? data.topMovers.find((a) => a.slug === slug)?.name ?? null;

// ── Level builders ────────────────────────────────────────────────────
function withinBudget(c: PropertyCand, pref: PrefSnapshot, lo: number, hi: number): boolean {
  if (pref.budgetMinLakh == null && pref.budgetMaxLakh == null) return true;
  const min = (pref.budgetMinLakh ?? 0) * lo;
  const max = (pref.budgetMaxLakh ?? Number.MAX_SAFE_INTEGER) * hi;
  return c.priceLakh >= min && c.priceLakh <= max;
}

/** LEVEL 1 — exact matches. */
export function buildMatched(data: GatheredData, now: Date): { views: MatchedPropertyView[]; produced: Produced[] } {
  const { pref, recentItems } = data;
  const cands = data.approvedProperties
    .filter((c) => matchesAnyType(c.propertyType, pref.propertyTypes))
    .filter((c) => withinBudget(c, pref, 0.9, 1.1))
    .filter((c) => c.corridorSlug != null && pref.areaSlugs.includes(c.corridorSlug))
    .filter((c) => {
      const h = entityHash("MATCHED_PROPERTY", c.id, materialSignature(c));
      return !suppressedByLedger(recentItems, "MATCHED_PROPERTY", c.id, h, now);
    })
    .sort((a, b) => (b.listingScore ?? 0) - (a.listingScore ?? 0))
    .slice(0, 6);

  const views: MatchedPropertyView[] = [];
  const produced: Produced[] = [];
  cands.forEach((c, i) => {
    const nm = areaName(data, c.corridorSlug);
    const why: string[] = ["within your budget"];
    if (nm) why.push(`${nm} is on your watchlist`);
    if (c.listingScore != null && c.listingSource === "SELLER") why.push(`scored ${gradeFor(c.listingScore)}`);
    const view = propertyView(c, nm, why);
    // A genuine price drop (below model) is the highest-signal item.
    const isDrop = view.belowModelPct != null && view.belowModelPct <= -5;
    const type: ReportItemType = isDrop ? "PRICE_DROP" : "MATCHED_PROPERTY";
    const weight = isDrop ? WEIGHT.PRICE_DROP : (c.listingScore ?? 0) >= 75 ? WEIGHT.NEW_EXACT_HIGH : WEIGHT.NEW_EXACT_ANY;
    views.push(view);
    produced.push({
      item: { itemType: type, entityId: c.id, entityHash: entityHash(type, c.id, materialSignature(c)), section: "matched", position: i },
      weight,
      top3: {
        type,
        title: view.title,
        subtitle: isDrop ? `${Math.abs(view.belowModelPct!)}% below model in ${nm ?? "your area"}` : `${money(c.priceLakh)}${nm ? ` · ${nm}` : ""}`,
        value: money(c.priceLakh),
      },
    });
  });
  return { views, produced };
}

/** LEVEL 2 — near misses (only when L1 yields < 4). Relax exactly one dimension. */
export function buildNearMisses(data: GatheredData, now: Date): { views: MatchedPropertyView[]; produced: Produced[] } {
  const { pref, recentItems } = data;
  const related = relatedTypes(pref.propertyTypes);
  const pool = [...data.approvedProperties, ...data.adjacentProperties];
  const seen = new Set<string>();
  const views: MatchedPropertyView[] = [];
  const produced: Produced[] = [];

  for (const c of pool) {
    if (views.length >= 4 || seen.has(c.id)) continue;
    if (c.corridorSlug == null) continue;
    const typeExact = matchesAnyType(c.propertyType, pref.propertyTypes);
    const areaExact = pref.areaSlugs.includes(c.corridorSlug);
    const budgetExact = withinBudget(c, pref, 0.9, 1.1);

    let relaxedLabel: string | null = null;
    // (a) budget relaxed: type+area exact, price within ±25% but outside ±10%
    if (typeExact && areaExact && !budgetExact && withinBudget(c, pref, 0.75, 1.25)) {
      const over = pref.budgetMaxLakh != null && c.priceLakh > pref.budgetMaxLakh;
      relaxedLabel = over ? "Slightly above your range" : "Slightly below your range";
    }
    // (b) area relaxed: type+budget exact, corridor adjacent to a watched one
    else if (typeExact && budgetExact && !areaExact) {
      const watchedNeighbour = pref.areaSlugs.find((w) => (data.adjacency[w] ?? []).includes(c.corridorSlug!));
      if (watchedNeighbour) relaxedLabel = `Next to ${areaName(data, watchedNeighbour) ?? watchedNeighbour}, which you watch`;
    }
    // (c) type relaxed: area+budget exact, related property type
    else if (areaExact && budgetExact && !typeExact && matchesAnyType(c.propertyType, related)) {
      relaxedLabel = `${c.propertyType} — close to what you watch`;
    }
    if (!relaxedLabel) continue;

    const h = entityHash("NEAR_MISS_PROPERTY", c.id, materialSignature(c));
    if (suppressedByLedger(recentItems, "NEAR_MISS_PROPERTY", c.id, h, now)) continue;

    seen.add(c.id);
    const nm = areaName(data, c.corridorSlug);
    const view = propertyView(c, nm, [], relaxedLabel);
    views.push(view);
    produced.push({
      item: { itemType: "NEAR_MISS_PROPERTY", entityId: c.id, entityHash: h, section: "nearMiss", position: views.length - 1 },
      weight: (c.listingScore ?? 0) >= 80 ? WEIGHT.NEAR_MISS_HIGH : 40,
      top3: { type: "NEAR_MISS_PROPERTY", title: view.title, subtitle: relaxedLabel, value: money(c.priceLakh) },
    });
  }
  return { views, produced };
}

/** LEVEL 3 — area intelligence (always included). */
export function buildAreaIntel(data: GatheredData): { areas: AreaView[]; produced: Produced[]; approvals: ReportContent["approvals"]; infrastructure: ReportContent["infrastructure"]; legal: ReportContent["legal"] } {
  const produced: Produced[] = [];
  const areas: AreaView[] = data.watchedAreas.map((a) => {
    const scoreDelta = a.overallScore != null && a.prevScore != null ? a.overallScore - a.prevScore : null;
    const pricePct = a.plotPriceMidSqYd != null && a.prevPriceMidSqYd != null && a.prevPriceMidSqYd > 0
      ? Math.round(((a.plotPriceMidSqYd - a.prevPriceMidSqYd) / a.prevPriceMidSqYd) * 1000) / 10
      : null;
    // spark: previous → current (2-point series; the page renders a mini line)
    const spark = a.prevScore != null && a.overallScore != null ? [a.prevScore, a.overallScore] : a.overallScore != null ? [a.overallScore, a.overallScore] : [];

    // Score move — report only when the value changed (Part 3.2 area rule)
    if (scoreDelta != null && Math.abs(scoreDelta) >= 1) {
      const hash = entityHash("AREA_SCORE_MOVE", a.slug, `sc${a.overallScore}`);
      if (!areaValueUnchanged(data.recentItems, "AREA_SCORE_MOVE", a.slug, hash)) {
        produced.push({
          item: { itemType: "AREA_SCORE_MOVE", entityId: a.slug, entityHash: hash, section: "areas", position: 0 },
          weight: Math.abs(scoreDelta) >= 4 ? WEIGHT.AREA_SCORE_MOVE : 45,
          top3: { type: "AREA_SCORE_MOVE", title: `${a.name} score ${a.prevScore} → ${a.overallScore}`, subtitle: `${scoreDelta > 0 ? "up" : "down"} ${Math.abs(scoreDelta)} points`, value: `${scoreDelta > 0 ? "▲+" : "▼"}${Math.abs(scoreDelta)}` },
        });
      }
    }
    if (pricePct != null && Math.abs(pricePct) >= 1) {
      const hash = entityHash("AREA_PRICE_MOVE", a.slug, `pr${a.plotPriceMidSqYd}`);
      if (!areaValueUnchanged(data.recentItems, "AREA_PRICE_MOVE", a.slug, hash)) {
        produced.push({
          item: { itemType: "AREA_PRICE_MOVE", entityId: a.slug, entityHash: hash, section: "areas", position: 1 },
          weight: Math.abs(pricePct) >= 3 ? WEIGHT.AREA_PRICE_MOVE : 35,
          top3: { type: "AREA_PRICE_MOVE", title: `${a.name} price ${pricePct > 0 ? "up" : "down"} ${Math.abs(pricePct)}%`, subtitle: `₹${Math.round(a.plotPriceMidSqYd ?? 0).toLocaleString("en-IN")}/sq.yd`, value: `${pricePct > 0 ? "▲+" : "▼"}${Math.abs(pricePct)}%` },
        });
      }
    }
    return { slug: a.slug, name: a.name, score: a.overallScore, scoreDelta, priceMidSqYd: a.plotPriceMidSqYd, pricePct, newListings: a.newListings, spark };
  });

  const approvals: ReportContent["approvals"] = data.newApprovals.map((ap) => {
    const hash = entityHash("NEW_APPROVAL", ap.id, "new");
    produced.push({
      item: { itemType: "NEW_APPROVAL", entityId: ap.id, entityHash: hash, section: "approvals", position: 0 },
      weight: WEIGHT.NEW_APPROVAL,
      top3: { type: "NEW_APPROVAL", title: `New approval in ${ap.corridorName ?? "your area"}`, subtitle: `${ap.approvalType} ${ap.approvalNumber ?? ""}`.trim(), value: ap.areaAcres ? `${ap.areaAcres} ac` : "" },
    });
    return { id: ap.id, label: `${ap.approvalType.replace(/_/g, " ")} ${ap.approvalNumber ?? ""}`.trim(), corridorName: ap.corridorName, areaAcres: ap.areaAcres, date: ap.approvalDate ? ap.approvalDate.toISOString() : null };
  });

  const infrastructure: ReportContent["infrastructure"] = data.infraMilestones.map((inf) => {
    const hash = entityHash("INFRA_MILESTONE", inf.id, inf.title);
    produced.push({
      item: { itemType: "INFRA_MILESTONE", entityId: inf.id, entityHash: hash, section: "infrastructure", position: 0 },
      weight: WEIGHT.INFRA_MILESTONE,
      top3: { type: "INFRA_MILESTONE", title: inf.title, subtitle: `${inf.projectShortName} · affects ${inf.affectedNames.slice(0, 2).join(", ")}`, value: "" },
    });
    return { id: inf.id, icon: "🛣️", title: `${inf.projectShortName} — ${inf.title}`, meta: [inf.date ? inf.date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : null].filter(Boolean).join(" · "), affects: inf.affectedNames, read: inf.description, url: `/market` };
  });

  const legal: ReportContent["legal"] = data.legalFlags.map((l) => {
    const hash = entityHash("LEGAL_ALERT", l.id, l.severity);
    produced.push({ item: { itemType: "LEGAL_ALERT", entityId: l.id, entityHash: hash, section: "legal", position: 0 }, weight: 50, top3: { type: "LEGAL_ALERT", title: l.title, subtitle: l.corridorName ?? "", value: l.severity } });
    return { id: l.id, title: l.title, corridorName: l.corridorName, severity: l.severity };
  });

  return { areas, produced, approvals, infrastructure, legal };
}

/** LEVEL 4 — market context (always appended, never the whole report). */
export function buildMarketContext(data: GatheredData): { produced: Produced[]; marketPulse: ReportContent["marketPulse"] } {
  const produced: Produced[] = [];
  if (data.marketPulse) {
    produced.push({
      item: { itemType: "MARKET_STAT", entityId: data.marketPulse.period, entityHash: entityHash("MARKET_STAT", data.marketPulse.period, "pulse"), section: "marketPulse", position: 0 },
      weight: WEIGHT.MARKET_STAT,
      top3: { type: "MARKET_STAT", title: `Hyderabad registrations ${data.marketPulse.period}`, subtitle: data.marketPulse.yoyGrowthPct != null ? `${data.marketPulse.yoyGrowthPct > 0 ? "▲+" : ""}${data.marketPulse.yoyGrowthPct}% YoY` : "", value: data.marketPulse.totalRegistrations?.toLocaleString("en-IN") ?? "" },
    });
  }
  return { produced, marketPulse: data.marketPulse };
}

// ── Top three (Part 3.3) ──────────────────────────────────────────────
/** Highest-weight items, with at least two distinct itemTypes enforced. */
export function pickTopThree(produced: Produced[]): TopThreeItem[] {
  const sorted = [...produced].sort((a, b) => b.weight - a.weight);
  const chosen: Produced[] = [];
  for (const p of sorted) {
    if (chosen.length >= 3) break;
    chosen.push(p);
  }
  // enforce ≥2 distinct types among the three
  if (chosen.length === 3 && new Set(chosen.map((c) => c.top3.type)).size === 1) {
    const alt = sorted.find((p) => p.top3.type !== chosen[0].top3.type);
    if (alt) chosen[2] = alt;
  }
  return chosen.map((c) => c.top3);
}

// ── The ladder ────────────────────────────────────────────────────────
export function runFallbackLadder(data: GatheredData, now: Date): AssembledReport {
  const l1 = buildMatched(data, now);
  const l2 = l1.views.length < 4 ? buildNearMisses(data, now) : { views: [], produced: [] };
  const l3 = buildAreaIntel(data);
  const l4 = buildMarketContext(data);

  const allProduced = [...l1.produced, ...l2.produced, ...l3.produced, ...l4.produced];
  const items: ReportItemOut[] = allProduced.map((p) => p.item);
  const topThree = pickTopThree(allProduced);

  // fallbackLevel records how far down the ladder we depended on for substance,
  // NOT how many sections rendered (L3/L4 always run). It drives the admin
  // distribution and the Part 4.2 rule (>=3 ⇒ no property cards, show the honest
  // "here's what moved in your areas" line instead).
  const exact = l1.views.length;
  const near = l2.views.length;
  const areaCount = l3.produced.length;
  let fallbackLevel: number;
  if (exact >= 4) fallbackLevel = 1;          // plenty of ideal matches
  else if (exact + near >= 1) fallbackLevel = 2; // some properties (exact or near)
  else if (areaCount >= 1) fallbackLevel = 3;  // no properties — area-intelligence led
  else fallbackLevel = 4;                       // nothing but market context

  const content: ReportContent = {
    meta: {
      budgetMinLakh: data.pref.budgetMinLakh,
      budgetMaxLakh: data.pref.budgetMaxLakh,
      propertyTypes: data.pref.propertyTypes,
      areaNames: data.watchedAreas.map((a) => a.name),
      city: data.pref.city,
    },
    thisWeek: topThree.map((t, i) => ({ rank: i + 1, text: `${t.title}${t.subtitle ? ` — ${t.subtitle}` : ""}` })),
    matched: l1.views,
    nearMisses: l2.views,
    areas: l3.areas,
    infrastructure: l3.infrastructure,
    approvals: l3.approvals,
    legal: l3.legal,
    marketPulse: l4.marketPulse,
  };

  return { content, items, topThree, itemCount: allProduced.length, usedFallback: fallbackLevel > 1, fallbackLevel };
}

// ── DB entry point ────────────────────────────────────────────────────
/** Gather data for a user's period and assemble the report (content only — the
 *  headline is a separate cached Claude call, see headline.ts). */
export async function assembleReport(userId: string, periodStart: Date, periodEnd: Date, now = new Date()): Promise<AssembledReport> {
  const { gatherReportData } = await import("./gather");
  const data = await gatherReportData(userId, periodStart, periodEnd);
  return runFallbackLadder(data, now);
}
