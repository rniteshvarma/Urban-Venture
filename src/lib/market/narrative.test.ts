import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { buildNarrative, coverageGaps, cycleFor, heatFor, type DeliveryRecord, type InfraNearby, type NarrativeInput } from "./narrative";
import type { CorridorMarketStats } from "./compute";
import type { AssetRates } from "./rates";

const rates = (median: number, projects: number, confidence: AssetRates["confidence"] = "MEDIUM", unit: AssetRates["unit"] = "₹/sq.ft"): AssetRates => ({
  unit, p25: median * 0.9, median, p75: median * 1.1, projects, units: projects * 2, radiusKm: 8, confidence,
});
const scen = (cagr5: number) => ({ cagr5, cagr10: cagr5, index: [100, 107, 114, 122, 131, 140, 150, 160, 171, 183, 196] });
const forecast = { scenarios: { conservative: scen(4), base: scen(7), optimistic: scen(10) } };

function market(over: Partial<CorridorMarketStats> = {}): CorridorMarketStats {
  return {
    version: "t", computedAt: "2026-10-21T00:00:00Z", centre: { lat: 17.4, lng: 78.4 },
    primaryAsset: "apartment",
    rates: { apartment: rates(6000, 20) },
    forecast: { plot: forecast, apartment: forecast } as unknown as CorridorMarketStats["forecast"],
    counts: { totalProjects: 20, reraProjects: 20, activeProjects: 4, readyProjects: 4, radiusKm: 8 },
    landEvidence: [], guidance: null, rental: null,
    city: {
      plotMedianSqYd: 18500,
      aptAvgSqFt: { value: 8000, unit: "₹/sq.ft", period: "2026", source: "ANAROCK", url: "https://example.org/anarock", published: "2026-07-01" },
      rentalYield: { value: 3.6, unit: "%", period: "2026", source: "City yield", url: "https://example.org/yield", published: "2026-07-01" },
    } as CorridorMarketStats["city"],
    ...over,
  };
}
const noDelivery: DeliveryRecord = { projects: 20, withDeadline: 0, overdue: 0, extended: 0, orders: 0 };
const infra = (name: string, status: string, yearsToGo: number, extra: Partial<InfraNearby> = {}): InfraNearby => ({
  name, status, yearsToGo, distanceKm: 3, estimatedCompletion: null, stale: false, sourceUrl: "https://example.org/src", ...extra,
});
const input = (over: Partial<NarrativeInput> = {}): NarrativeInput => ({ label: "Testpur", market: market(), infra: [], delivery: noDelivery, overallScore: 60, ...over });

describe("corridor labels come from data, with a stated basis", () => {
  test("heat follows the corridor score bands", () => {
    assert.equal(heatFor(85), "FIRE");
    assert.equal(heatFor(70), "VERY_HOT");
    assert.equal(heatFor(69), "HOT");
    assert.equal(heatFor(45), "EMERGING");
    assert.equal(heatFor(10), "EARLY");
    assert.match(buildNarrative(input({ overallScore: 72 })).basis.heat, /72\/100/);
  });

  test("timing stage reads the infrastructure pipeline, not a hand-picked label", () => {
    assert.equal(cycleFor([infra("Metro", "UNDER_CONSTRUCTION", 2)]).cycle, "MID_CYCLE");
    assert.equal(cycleFor([infra("Road", "APPROVED", 2)]).cycle, "ACT_NOW");
    assert.equal(cycleFor([infra("Ring road", "APPROVED", 5)]).cycle, "WATCH_AND_BUY");
    assert.equal(cycleFor([infra("Far idea", "ANNOUNCED", 9)]).cycle, "PATIENT_CAPITAL");
    assert.equal(cycleFor([]).cycle, "PATIENT_CAPITAL");
    // A project far away doesn't set the stage, and cancelled ones never do.
    assert.equal(cycleFor([infra("Metro", "UNDER_CONSTRUCTION", 1, { distanceKm: 40 })]).cycle, "PATIENT_CAPITAL");
    assert.equal(cycleFor([infra("Dead", "CANCELLED", 0)]).cycle, "PATIENT_CAPITAL");
    assert.match(cycleFor([infra("Metro", "UNDER_CONSTRUCTION", 2)]).basis, /Metro is under construction/);
  });

  test("every driver and risk names its source", () => {
    const n = buildNarrative(input({
      infra: [infra("Metro", "APPROVED", 4, { estimatedCompletion: "FY 2029-30" })],
      delivery: { projects: 10, withDeadline: 8, overdue: 3, extended: 1, orders: 6 },
      market: market({ rental: { grossYield: 4.1, listings: 30, radiusKm: 5 } as CorridorMarketStats["rental"], counts: { totalProjects: 20, reraProjects: 20, activeProjects: 12, readyProjects: 12, radiusKm: 8 } }),
    }));
    assert.ok(n.drivers.length >= 3);
    for (const f of [...n.drivers, ...n.risks]) assert.ok(f.source.length > 3, `no source on "${f.text}"`);
    assert.ok(n.drivers.some((f) => /Metro: approved, not yet started, due FY 2029-30 — 3 km away/.test(f.text)));
    assert.ok(n.drivers.some((f) => /4\.1%/.test(f.text)));
  });

  test("risk level: overdue projects, frequent orders, unbuilt infrastructure and thin data add up", () => {
    // 3 of 8 overdue (≥25%) = 2, orders 6 over 10 projects = 1 → HIGH
    const high = buildNarrative(input({ delivery: { projects: 10, withDeadline: 8, overdue: 3, extended: 0, orders: 6 } }));
    assert.equal(high.riskLevel, "HIGH");
    assert.match(high.basis.risk, /38% of projects with RERA dates are overdue/);
    assert.ok(high.risks.some((r) => /3 of 8 nearby projects/.test(r.text)));
    // Many orders spread over many projects is reported, but doesn't raise the level.
    const big = buildNarrative(input({ delivery: { projects: 180, withDeadline: 40, overdue: 0, extended: 0, orders: 39 } }));
    assert.equal(big.riskLevel, "LOW");
    assert.ok(big.risks.some((r) => /39 TG-RERA orders/.test(r.text)));
    // Thin price data alone → MEDIUM, and the page says why.
    const thin = buildNarrative(input({ market: market({ rates: { apartment: rates(6000, 3, "LOW") }, counts: { totalProjects: 3, reraProjects: 3, activeProjects: 0, readyProjects: 0, radiusKm: 8 } }) }));
    assert.equal(thin.riskLevel, "MEDIUM");
    assert.match(thin.basis.risk, /thin price data/);
  });

  test("no delivery data means no delivery claim either way", () => {
    const n = buildNarrative(input());
    assert.ok(!n.risks.some((r) => /TG-RERA completion/.test(r.text)));
    assert.ok(coverageGaps(market(), noDelivery, true).some((g) => /Delivery record/.test(g)));
  });

  test("an unbuilt flagship project is flagged as a timing risk", () => {
    const n = buildNarrative(input({ infra: [infra("Ring road", "ANNOUNCED", 6)] }));
    assert.ok(n.risks.some((r) => /Ring road, is announced/.test(r.text)));
    assert.equal(n.riskLevel, "MEDIUM");
  });

  test("who it suits follows price, yield and stock", () => {
    const premium = buildNarrative(input({ market: market({ rates: { apartment: rates(11000, 50) } }) }));
    assert.deepEqual(premium.bestFor, ["HNI_PORTFOLIO_BUILDER"]);
    const affordable = buildNarrative(input({ market: market({ rates: { apartment: rates(5000, 30) } }) }));
    assert.ok(affordable.bestFor.includes("FIRST_TIME_BUYER"));
    const land = buildNarrative(input({ market: market({ primaryAsset: "plot", rates: { plot: rates(15000, 6, "MEDIUM", "₹/sq.yd") } }) }));
    assert.deepEqual(land.bestFor, ["LAND_SPECULATOR"]);
  });

  test("coverage gaps list what isn't measured", () => {
    const gaps = coverageGaps(market({ rates: {} }), noDelivery, false);
    assert.ok(gaps.some((g) => /Plot prices/.test(g)));
    assert.ok(gaps.some((g) => /Apartment prices/.test(g)));
    assert.ok(gaps.some((g) => /Rental yield/.test(g)));
    assert.ok(gaps.some((g) => /Price history/.test(g)));
    assert.ok(!coverageGaps(market(), noDelivery, true).some((g) => /Price history/.test(g)));
  });
});
