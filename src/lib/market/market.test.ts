import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { measureRates, unitRate, type ListingForRates } from "./rates";
import { forecastCorridor, infraPremium, ANCHOR_RATES } from "./forecast";
import { marketScores } from "./scores";
import { CITY, CITY_LONG_RUN_CAGR } from "./anchors";

const C = { lat: 17.4, lng: 78.4 };
// A listing `km` north of the centre with apartment units at the given ₹/sq.ft.
const apt = (id: string, km: number, ...rates: number[]): ListingForRates => ({
  id, lat: C.lat + km / 110.574, lng: C.lng,
  units: rates.map((r) => ({ category: "APARTMENT", areaSqFt: 1000, areaSqYd: null, priceLakh: (r * 1000) / 100_000 })),
});
const plot = (id: string, km: number, rate: number): ListingForRates => ({
  id, lat: C.lat + km / 110.574, lng: C.lng,
  units: [{ category: "PLOT", areaSqFt: null, areaSqYd: 200, priceLakh: (rate * 200) / 100_000 }],
});

describe("measured rates", () => {
  test("each project counts once, at its units' median", () => {
    // One project with many expensive unit types must not drag the median.
    const ls = [apt("a", 1, 6000), apt("b", 1, 6200), apt("c", 2, 6400), apt("d", 2, 6600), apt("big", 1, 20000, 20000, 20000, 20000, 20000, 20000)];
    const r = measureRates(C, ls, "apartment")!;
    assert.equal(r.projects, 5);
    assert.equal(r.median, 6400);
    assert.equal(r.radiusKm, 5);
    assert.equal(r.confidence, "MEDIUM");
  });

  test("the radius widens until enough projects are found, and says so", () => {
    const ls = [plot("a", 1, 20000), plot("b", 6, 22000), plot("c", 7, 24000), plot("d", 7.5, 26000)];
    const r = measureRates(C, ls, "plot")!;
    assert.equal(r.radiusKm, 8);
    assert.equal(r.projects, 4);
    assert.equal(r.unit, "₹/sq.yd");
  });

  test("too few projects gives no figure, never a guess", () => {
    assert.equal(measureRates(C, [plot("a", 1, 20000)], "plot"), null);
    assert.equal(measureRates(C, [plot("a", 20, 20000), plot("b", 21, 20000)], "plot"), null);
  });

  test("two projects is a LOW-confidence figure", () => {
    assert.equal(measureRates(C, [plot("a", 1, 20000), plot("b", 2, 30000)], "plot")?.confidence, "LOW");
  });

  test("insane rates (unit mix-ups) are dropped, and villas are not apartments", () => {
    assert.equal(unitRate("apartment", { category: "APARTMENT", areaSqFt: 1000, areaSqYd: null, priceLakh: 0.5 }), null); // ₹50/sq.ft
    assert.equal(unitRate("apartment", { category: "VILLA", areaSqFt: 3000, areaSqYd: null, priceLakh: 300 }), null);
    assert.equal(unitRate("plot", { category: "PLOT", areaSqFt: null, areaSqYd: 200, priceLakh: 40 }), 20000);
  });
});

describe("forecast", () => {
  test("anchors come from the published city figures", () => {
    assert.equal(ANCHOR_RATES.conservative, CITY.rbiAllIndiaHpiYoY.value);
    assert.equal(ANCHOR_RATES.base, CITY.priceGrowthYoY.value);
    assert.ok(CITY_LONG_RUN_CAGR > 9 && CITY_LONG_RUN_CAGR < 10.5, String(CITY_LONG_RUN_CAGR)); // ₹4,195 → ₹8,090 in ~7 years
  });

  test("a neutral apartment corridor tracks the city: base ≈ 7% a year", () => {
    const f = forecastCorridor({ asset: "apartment", infraScore: 12.5, priceConfidence: "HIGH", relativePrice: 1 });
    assert.equal(f.scenarios.base.cagr10, 7);
    assert.equal(f.scenarios.base.index[0], 100);
    assert.equal(f.scenarios.base.index.length, 11);
    assert.ok(f.scenarios.conservative.cagr10 < f.scenarios.base.cagr10 && f.scenarios.base.cagr10 < f.scenarios.optimistic.cagr10);
  });

  test("ten years stays in a believable range — nothing like a 6× index", () => {
    const best = forecastCorridor({ asset: "plot", infraScore: 25, priceConfidence: "LOW", relativePrice: 0.3 });
    assert.ok(best.scenarios.base.index[10] < 280, String(best.scenarios.base.index[10]));
    assert.ok(best.scenarios.optimistic.index[10] < 450, String(best.scenarios.optimistic.index[10]));
    assert.ok(best.scenarios.conservative.index[10] >= 100);
  });

  test("plots carry a land premium; strong infrastructure adds a premium that fades", () => {
    const flat = forecastCorridor({ asset: "apartment", infraScore: 12.5, priceConfidence: "HIGH", relativePrice: 1 });
    const land = forecastCorridor({ asset: "plot", infraScore: 12.5, priceConfidence: "HIGH", relativePrice: 1 });
    assert.ok(land.scenarios.base.cagr10 > flat.scenarios.base.cagr10);
    assert.equal(infraPremium(25), 1.5);
    assert.equal(infraPremium(0), -1.5);
    assert.equal(infraPremium(null), 0);
    const strong = forecastCorridor({ asset: "apartment", infraScore: 25, priceConfidence: "HIGH", relativePrice: 1 });
    assert.ok(strong.scenarios.base.cagr3 > strong.scenarios.base.cagr10); // premium fades over time
  });

  test("thin data or an early-stage area widens the range, and says why", () => {
    const sure = forecastCorridor({ asset: "plot", infraScore: 15, priceConfidence: "HIGH", relativePrice: 1 });
    const thin = forecastCorridor({ asset: "plot", infraScore: 15, priceConfidence: "LOW", relativePrice: 1 });
    assert.equal(sure.inputs.widened, false);
    assert.equal(thin.inputs.widenedBecause, "few listings to measure prices from");
    assert.ok(thin.scenarios.optimistic.cagr10 > sure.scenarios.optimistic.cagr10);
    assert.ok(thin.scenarios.conservative.cagr10 < sure.scenarios.conservative.cagr10);
    assert.equal(thin.scenarios.base.cagr10, sure.scenarios.base.cagr10);
  });
});

describe("market scores", () => {
  test("components are 0–25 and sum to the overall score", () => {
    const s = marketScores({ infraScore: 18, reraProjects: 60, activeProjects: 40, baseCagr5: 12 });
    assert.deepEqual([s.approvalScore, s.demandScore, s.appreciationScore], [25, 25, 25]);
    assert.equal(s.overallScore, 93);
    assert.equal(s.sentiment, "BULLISH");
  });

  test("an area with no projects and a city-pace outlook scores low, not a default", () => {
    const s = marketScores({ infraScore: 5, reraProjects: 0, activeProjects: 0, baseCagr5: 4 });
    assert.equal(s.overallScore, 5);
    assert.equal(s.sentiment, "CAUTIOUS");
  });
});
