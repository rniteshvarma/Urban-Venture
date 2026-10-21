import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { entryPrice, recommend, type CorridorForResearch } from "./recommend";
import type { CorridorMarketStats } from "../market/compute";
import type { CorridorNarrative } from "../market/narrative";

const scen = (c5: number, c10: number) => ({ cagr5: c5, cagr10: c10, index: [] });
const fc = { scenarios: { conservative: scen(4, 3.5), base: scen(7, 6.5), optimistic: scen(10, 9) } };
const rates = (p25: number, projects = 10) => ({ unit: "₹/sq.ft" as const, p25, median: p25 * 1.1, p75: p25 * 1.2, projects, units: projects, radiusKm: 8, confidence: "MEDIUM" as const });

function corridor(slug: string, score: number, m: Partial<CorridorMarketStats>, n: Partial<CorridorNarrative> = {}): CorridorForResearch {
  const narrative = {
    heatRating: "HOT", investmentCycle: "MID_CYCLE", riskLevel: "MEDIUM", bestFor: [], drivers: [], risks: [],
    basis: { heat: "", cycle: "", risk: "Medium: test." }, delivery: { projects: 0, withDeadline: 0, overdue: 0, extended: 0, orders: 0 }, overallScore: score, version: "t", ...n,
  } as CorridorMarketStats["narrative"];
  return {
    slug, name: slug, shortName: slug, zone: "Zone", overallScore: score,
    market: { primaryAsset: "plot", rates: {}, forecast: { plot: fc, apartment: fc }, rental: null, narrative, ...m } as unknown as CorridorMarketStats,
  };
}

describe("research report from measured data", () => {
  test("entry price is a 150 sq.yd plot or 1,100 sq.ft flat at the lower quartile", () => {
    const m = { rates: { plot: rates(20000), apartment: rates(6000) } } as unknown as CorridorMarketStats;
    assert.equal(entryPrice(m, "plot")!.lakh, 30);
    assert.equal(entryPrice(m, "apartment")!.lakh, 66);
    assert.equal(entryPrice({ rates: {} } as unknown as CorridorMarketStats, "plot"), null);
  });

  test("only corridors whose entry fits the budget are suggested", () => {
    const cheap = corridor("cheap", 50, { rates: { plot: rates(15000) } });      // 22.5 L
    const dear = corridor("dear", 90, { rates: { plot: rates(60000) } });        // 90 L
    const r = recommend([cheap, dear], 40, 10);
    assert.deepEqual(r.corridors.map((c) => c.slug), ["cheap"]);
    assert.match(r.executiveSummary, /1 of the 2 corridors/);
  });

  test("falls back to the other asset when only it fits", () => {
    const c = corridor("x", 60, { primaryAsset: "apartment", rates: { apartment: rates(9000), plot: rates(15000) } });
    const r = recommend([c], 40, 10);
    assert.equal(r.corridors[0].asset, "plot");
    assert.equal(r.corridors[0].rentalYield, null);
  });

  test("growth shown is the model's scenario range for the horizon, never a typed number", () => {
    const c = corridor("x", 60, { rates: { plot: rates(15000) } });
    assert.deepEqual([recommend([c], 40, 3).corridors[0].appreciationMin, recommend([c], 40, 3).corridors[0].appreciationMax], [4, 10]);
    assert.deepEqual([recommend([c], 40, 10).corridors[0].appreciationMin, recommend([c], 40, 10).corridors[0].appreciationMax], [3.5, 9]);
  });

  test("long-horizon corridors rank lower for short holds and higher for long ones", () => {
    const early = corridor("early", 60, { rates: { plot: rates(15000) } }, { investmentCycle: "PATIENT_CAPITAL" });
    const building = corridor("building", 60, { rates: { plot: rates(15000) } }, { investmentCycle: "MID_CYCLE" });
    assert.equal(recommend([early, building], 40, 3).corridors[0].slug, "building");
    const long = recommend([early, building], 40, 10).corridors;
    assert.ok(long.find((c) => c.slug === "early")!.matchScore > recommend([early], 40, 3).corridors[0].matchScore);
  });

  test("nothing fits → an honest empty report", () => {
    const r = recommend([corridor("dear", 90, { rates: { plot: rates(60000) } })], 20, 5);
    assert.equal(r.corridors.length, 0);
    assert.match(r.executiveSummary, /None of the 1 corridors/);
  });

  test("measured rent is carried for flats, and the yield is stated as measured", () => {
    const c = corridor("x", 60, { primaryAsset: "apartment", rates: { apartment: rates(5000) }, rental: { grossYieldRange: [3.2, 4.1] } as CorridorMarketStats["rental"] });
    const r = recommend([c], 80, 10).corridors[0];
    assert.deepEqual(r.rentalYield, [3.2, 4.1]);
    assert.ok(r.exitOpportunities.some((e) => /3\.2–4\.1%/.test(e)));
  });
});
