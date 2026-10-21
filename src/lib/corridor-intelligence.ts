/**
 * Corridor intelligence: the corridor score and everything said about a
 * corridor — labels, drivers, risks, who it suits — recomputed from measured
 * data (src/lib/market/narrative.ts). Nothing here is typed in by hand or
 * written by a model without a source.
 */
import prisma from "./prisma";
import { Sentiment } from "@prisma/client";
import { corridorInfraFromDb, loadScoringProjects, snapshotCorridor } from "./infra-intel/rescore";
import { yearsToCompletion } from "./infra-intel/scoring";
import { buildCorridorMarket, corridorCentre, loadMarketContext, syncReraApprovals, writeCorridorMarket, COUNT_RADIUS_KM, type CorridorMarketStats, type MarketContext } from "./market/compute";
import { marketScores } from "./market/scores";
import { buildNarrative, NARRATIVE_VERSION, type DeliveryRecord } from "./market/narrative";
import { haversineKm } from "./osm/geo";
import type { DeveloperRecordJson } from "./developers/sync";
import type { ProjectRecord } from "./developers/track-record";

/** Per-project TG-RERA delivery records and each developer's order count, from the Developer table. */
export interface DeliveryContext {
  byProject: Map<string, ProjectRecord>;
  ordersByProject: Map<string, { developer: string; orders: number }>;
}

export async function loadDeliveryContext(): Promise<DeliveryContext> {
  const devs = await prisma.developer.findMany({ select: { slug: true, stats: true } }).catch(() => []);
  const byProject = new Map<string, ProjectRecord>();
  const ordersByProject = new Map<string, { developer: string; orders: number }>();
  for (const d of devs) {
    const r = d.stats as unknown as DeveloperRecordJson | null;
    if (!r?.projects) continue;
    for (const p of r.projects) {
      byProject.set(p.id, p);
      ordersByProject.set(p.id, { developer: d.slug, orders: r.orders?.length ?? 0 });
    }
  }
  return { byProject, ordersByProject };
}

/** Delivery record of the listings within COUNT_RADIUS_KM of a corridor centre. */
export function deliveryNear(centre: { lat: number; lng: number } | null, ctx: MarketContext, dc: DeliveryContext): DeliveryRecord {
  const out: DeliveryRecord = { projects: 0, withDeadline: 0, overdue: 0, extended: 0, orders: 0 };
  if (!centre) return out;
  const devs = new Map<string, number>();
  for (const l of ctx.listings) {
    if (haversineKm(centre.lat, centre.lng, l.lat, l.lng) > COUNT_RADIUS_KM) continue;
    out.projects++;
    const r = dc.byProject.get(l.id);
    if (r?.reraDeadline) {
      out.withDeadline++;
      if (r.flags.includes("OVERDUE")) out.overdue++;
    }
    if (r?.flags.includes("EXTENDED")) out.extended++;
    const o = dc.ordersByProject.get(l.id);
    if (o) devs.set(o.developer, o.orders);
  }
  out.orders = [...devs.values()].reduce((s, n) => s + n, 0);
  return out;
}

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

/** One-paragraph commentary from measured figures only. */
export function marketSummary(label: string, m: CorridorMarketStats): string {
  const parts: string[] = [];
  if (m.rates.plot) parts.push(`plots around ${inr(m.rates.plot.median)}/sq.yd (${m.rates.plot.projects} projects)`);
  if (m.rates.apartment) parts.push(`apartments around ${inr(m.rates.apartment.median)}/sq.ft (${m.rates.apartment.projects} projects)`);
  const f = m.forecast[m.primaryAsset].scenarios;
  const prices = parts.length ? `Our listings put ${label} at ${parts.join(" and ")}.` : `We don't have enough listings in ${label} yet to measure prices.`;
  return `${prices} Base-case outlook: about ${f.base.cagr5}% a year over five years (range ${f.conservative.cagr5}–${f.optimistic.cagr5}%), based on Hyderabad's published price growth and the area's infrastructure pipeline.`;
}

export async function computeCorridorScore(
  corridor: string,
  opts: { ctx?: MarketContext; scoringProjects?: Awaited<ReturnType<typeof loadScoringProjects>>; delivery?: DeliveryContext } = {},
) {
  console.log(`Calculating Corridor Intelligence Score for: ${corridor}`);

  // 1. INFRA SCORE (0-25) — dynamic: distance, stage, time-to-completion,
  // 90-day momentum and staleness per project (src/lib/infra-intel/scoring.ts).
  // Replaces the old Σ statusWeight × reImpactScore × 0.2, which saturated at
  // three projects and ignored distance, time and change.
  const labelRow = await prisma.corridorProfile.findUnique({ where: { slug: corridor }, select: { shortName: true, name: true, centroidLat: true, centroidLng: true } });
  const corridorLabel = labelRow?.shortName || labelRow?.name || corridor;
  // A corridor without a stored centre gets its gazetteer location, so the
  // infra scorer can use real distances and the price radius has a middle.
  const centre = labelRow ? corridorCentre(labelRow) : null;
  if (labelRow && labelRow.centroidLat == null && centre) {
    await prisma.corridorProfile.update({ where: { slug: corridor }, data: { centroidLat: centre.lat, centroidLng: centre.lng } });
  }
  const infraResult = await corridorInfraFromDb(corridor, opts.scoringProjects);
  const infraScore = infraResult.infraScore;

  // 2–4. RERA projects, developer activity and growth outlook — measured
  // from our listings and the published city anchors (src/lib/market/).
  // These used to read synthetic absorption / search / price-history tables.
  const ctx = opts.ctx ?? (await loadMarketContext());
  const market = buildCorridorMarket(corridor, centre, infraScore, ctx);
  await writeCorridorMarket(corridor, market, false);
  const primary = market.forecast[market.primaryAsset];
  const { approvalScore, demandScore, appreciationScore, overallScore, sentiment: investorSentiment } = marketScores({
    infraScore,
    reraProjects: market.counts.reraProjects,
    activeProjects: market.counts.activeProjects,
    baseCagr5: primary.scenarios.base.cagr5,
  });
  const adminNote = marketSummary(corridorLabel, market);

  // 5. What we say about the corridor — labels, drivers, risks, who it suits —
  // from the figures above, the infrastructure tracker and TG-RERA records.
  const infraRows = await prisma.infraProject.findMany({
    where: { id: { in: infraResult.drivers.map((d) => d.projectId) } },
    select: { id: true, estimatedCompletion: true, sourceUrl: true },
  });
  const infraById = new Map(infraRows.map((r) => [r.id, r]));
  const narrative = buildNarrative({
    label: corridorLabel,
    market,
    overallScore,
    infra: infraResult.drivers.map((d) => {
      const row = infraById.get(d.projectId);
      return {
        // Without a location or route the scorer assumes a listed project is close;
        // that assumed distance isn't a measurement, so it isn't shown.
        name: d.name, status: d.status, distanceKm: d.distanceAssumed ? null : d.distanceKm, stale: d.stale,
        estimatedCompletion: row?.estimatedCompletion ?? null, sourceUrl: row?.sourceUrl ?? null,
        yearsToGo: yearsToCompletion(row?.estimatedCompletion, d.status),
      };
    }),
    delivery: deliveryNear(centre, ctx, opts.delivery ?? (await loadDeliveryContext())),
  });
  const keyDrivers = narrative.drivers.map((f) => f.text);
  const keyRisks = narrative.risks.map((f) => f.text);
  const bestFor = narrative.bestFor as string[];

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
      corridorProfileSlug: corridor,
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
      corridorProfileSlug: corridor,
      lastComputedAt: new Date()
    }
  });

  await snapshotCorridor(corridor, infraResult, overallScore);

  // Also update CorridorProfile directly
  await prisma.corridorProfile.update({
    where: { slug: corridor },
    data: {
      overallScore,
      infraScore,
      approvalScore,
      demandScore,
      appreciationScore,
      sentiment: investorSentiment as Sentiment,
      heatRating: narrative.heatRating,
      investmentCycle: narrative.investmentCycle,
      riskLevel: narrative.riskLevel,
      keyDrivers,
      keyRisks,
      bestFor,
      adminNote,
      marketStats: { ...market, narrative: { version: NARRATIVE_VERSION, ...narrative } } as unknown as object,
    }
  });

  return result;
}

export async function computeAllCorridorScores() {
  // Get all unique corridors from CorridorProfile
  const corridors = await prisma.corridorProfile.findMany({
    select: {
      slug: true
    }
  });

  console.log(`Starting scoring recomputation for ${corridors.length} corridors...`);
  const ctx = await loadMarketContext();
  const scoringProjects = await loadScoringProjects();
  const delivery = await loadDeliveryContext();
  const results = [];
  for (const c of corridors) {
    try {
      const res = await computeCorridorScore(c.slug, { ctx, scoringProjects, delivery });
      results.push(res);
    } catch (e) {
      console.error(`Failed to compute score for ${c.slug}:`, e);
    }
  }
  const centres = await prisma.corridorProfile.findMany({ select: { slug: true, centroidLat: true, centroidLng: true } });
  const synced = await syncReraApprovals(ctx, centres.map((c) => ({ slug: c.slug, centre: c.centroidLat != null && c.centroidLng != null ? { lat: c.centroidLat, lng: c.centroidLng } : null })));
  console.log(`Rebuilt ${synced} RERA approval records from listings`);
  return results;
}

