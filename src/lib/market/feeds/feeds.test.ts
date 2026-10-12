import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { parseUnitRateRows, summariseVillage } from "./registration";
import { extractLocalityData, parseLocalityData } from "./magicbricks";
import { detectPeriod, extractCandidates } from "./news";

const fixture = (name: string) => readFileSync(path.join(__dirname, "fixtures", name), "utf8");

describe("TG registration unit rates", () => {
  const land = parseUnitRateRows(fixture("tg-unit-rates-land.html"));
  const apartment = parseUnitRateRows(fixture("tg-unit-rates-apartment.html"));

  test("reads every visible row, ignoring the commented-out columns", () => {
    assert.equal(land.length, 17);
    assert.deepEqual(land[0], { locality: "KOKAPET CHANDRA REDDY CIRCLE TO ORR SERVICE R", value: 47600, effective: "2026-06-05" });
    assert.equal(apartment.length, 17);
    assert.equal(apartment[0].value, 6600); // the apartment rate, not the hidden land value
    assert.equal(apartment.find((r) => r.locality === "REST ALL")?.value, 2700);
  });

  test("a village's general rate is its village-wide row; max is the dearest road", () => {
    const v = summariseVillage("KOKAPET", land, apartment);
    assert.deepEqual(v.land, { general: 27000, max: 47600, rows: 17 });
    assert.deepEqual(v.apartment, { general: 2700, max: 6600, rows: 17 });
    assert.equal(v.effective, "2026-06-05");
  });

  test("without a village-wide row the lowest rate is the general one; an empty page is no data", () => {
    const rows = [{ locality: "MAIN ROAD", value: 30000, effective: null }, { locality: "INNER LANES", value: 18000, effective: null }];
    assert.equal(summariseVillage("X", rows, []).land?.general, 18000);
    assert.equal(summariseVillage("X", [], []).land, null);
    assert.deepEqual(parseUnitRateRows("<html><body>No records</body></html>"), []);
  });
});

describe("MagicBricks locality rates (internal)", () => {
  test("five quarters of apartment averages and the change across them", () => {
    const s = parseLocalityData(JSON.parse(fixture("mb-kokapet-apartment.json")), "apartment", "Kokapet")!;
    assert.equal(s.latest, 11160);
    assert.equal(s.history.length, 5);
    assert.equal(s.history[0].quarter, "Jul-Sep'25");
    assert.equal(s.yoyPct, 5.9); // 10,540 → 11,160
    assert.equal(s.unit, "₹/sq.ft");
  });

  test("a plot page reads as ₹/sq.yd, and a page for another property type is not misread", () => {
    const plot = JSON.parse(fixture("mb-kadthal-plot.json"));
    assert.equal(parseLocalityData(plot, "plot", "Kadthal")?.latest, 15021);
    assert.equal(parseLocalityData(plot, "plot", "Kadthal")?.unit, "₹/sq.yd");
    assert.equal(parseLocalityData(plot, "apartment", "Kadthal"), null);
  });

  test("the embedded JSON is cut out of the page even with script after it", () => {
    const html = `<script>window.__LOCALITY_DATA__ = {"locName":"A \\"B\\"","graphData":{"quarterValues":["Q"],"averageRangeValues":[5]}};var x={};</script>`;
    assert.equal(extractLocalityData(html)?.locName, 'A "B"');
    assert.equal(extractLocalityData("<html></html>"), null);
  });
});

describe("figures from research-firm news", () => {
  const at = new Date("2026-08-19T00:00:00Z");

  test("registrations, value and period from a Knight Frank monthly headline", () => {
    const c = extractCandidates({ headline: "Hyderabad registers 6,166 residential properties worth Rs 4,447 crore in July: Knight Frank", url: "u", publishedAt: at, sourceName: "S" });
    assert.deepEqual(c.map((x) => [x.metric, x.value, x.period]), [
      ["city_registrations", 6166, "July 2026"],
      ["city_registrations_value_cr", 4447, "July 2026"],
    ]);
    assert.equal(c[0].firm, "Knight Frank");
  });

  test("average price and price growth from a half-year report", () => {
    const c = extractCandidates({ headline: "Hyderabad housing sales rise 1% in H1 2026; prices up 7% to Rs 8,258 per sq ft: Knight Frank", url: "u", publishedAt: at, sourceName: "S" });
    const by = Object.fromEntries(c.map((x) => [x.metric, x.value]));
    assert.equal(by.city_avg_price_sqft, 8258);
    assert.equal(by.city_price_growth_yoy, 7);
    assert.equal(c[0].period, "H1 2026");
  });

  test("other cities, multi-city roundups and articles without a research firm are ignored", () => {
    assert.deepEqual(extractCandidates({ headline: "Mumbai property registrations rise 5% YoY to 12,622 in September: Knight Frank", url: "u", publishedAt: at, sourceName: "S" }), []);
    assert.deepEqual(extractCandidates({ headline: "Housing sales in Mumbai, Pune, Hyderabad and Bengaluru rise 3% to one lakh units: Anarock", url: "u", publishedAt: at, sourceName: "S" }), []);
    assert.deepEqual(extractCandidates({ headline: "Hyderabad sees 6,000 homes registered in July", url: "u", publishedAt: at, sourceName: "S" }), []);
  });

  test("periods: quarters, fiscal years, and a month later than publication is last year's", () => {
    assert.equal(detectPeriod("sales in Q3 2026", at), "Q3 2026");
    assert.equal(detectPeriod("in FY2025-26", at), "FY2025-26");
    assert.equal(detectPeriod("in December", at), "December 2025");
    assert.equal(detectPeriod("no date here", at), "as reported, Aug 2026");
  });
});
