// Edge cases for the market feeds' pure parsers (feeds.test.ts covers the happy paths).
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { parseUnitRateRows, summariseVillage } from "./registration";
import { extractLocalityData, parseLocalityData } from "./magicbricks";
import { detectPeriod, extractCandidates } from "./news";

const at = new Date("2026-08-19T00:00:00Z");
const headline = (h: string, blurb?: string) => extractCandidates({ headline: h, blurb, url: "u", publishedAt: at, sourceName: "S" });

describe("news figures — edge cases", () => {
  test("'may' the verb is not the month of May", () => {
    assert.equal(detectPeriod("Hyderabad prices may rise further, says Knight Frank", at), "as reported, Aug 2026");
    assert.equal(detectPeriod("registrations in May 2026", at), "May 2026");
    assert.equal(detectPeriod("registrations rose in May", at), "May 2026");
  });

  test("fiscal-year shorthands", () => {
    assert.equal(detectPeriod("in FY26", at), "FY2026");
    assert.equal(detectPeriod("during FY 2025-26", at), "FY2025-26");
  });

  test("a stamp-duty or revenue figure is not the registered value", () => {
    const c = headline("Hyderabad registers 7,000 homes in July; stamp duty revenue at Rs 350 crore: Knight Frank");
    assert.ok(!c.some((x) => x.metric === "city_registrations_value_cr"), JSON.stringify(c));
    assert.equal(c.find((x) => x.metric === "city_registrations")?.value, 7000);
  });

  test("price declines are captured as negative growth, not missed or flipped", () => {
    const c = headline("Hyderabad housing prices fall 3% in Q3 2026 as sales slow: ANAROCK");
    assert.equal(c.find((x) => x.metric === "city_price_growth_yoy")?.value, -3);
  });

  test("Rs. / ₹ / INR spellings and decimals in crore figures", () => {
    for (const h of [
      "Hyderabad registers 6,166 homes worth ₹4,447 crore in July: Knight Frank",
      "Hyderabad registers 6,166 homes worth Rs. 4,447 cr in July: Knight Frank",
      "Hyderabad registers 6,166 homes worth INR 4,447.5 crore in July: Knight Frank",
    ]) assert.ok(headline(h).some((x) => x.metric === "city_registrations_value_cr" && Math.round(x.value) >= 4447), h);
  });

  test("a figure next to another city is not attributed to Hyderabad", () => {
    assert.deepEqual(headline("Bengaluru registers 9,000 homes in July while Hyderabad cools: Knight Frank"), []);
  });

  test("implausible numbers are ignored", () => {
    assert.deepEqual(headline("Hyderabad apartment prices at Rs 900 per sq ft in 2010: Knight Frank archive").filter((x) => x.metric === "city_avg_price_sqft"), []);
  });
});

describe("registration unit rates — edge cases", () => {
  const row = (cells: string[]) => `<tr>${cells.map((c) => `<td class="formbg2">${c}</td>`).join("")}</tr>`;
  test("rows with no value, a dash, or no date are skipped; values with commas and spaces parse", () => {
    const html = `<table><tbody>${[
      row(["1.", "0-1", "MAIN ROAD", "  12,500 ", "05/06/2026", ""]),
      row(["2.", "0-2", "LANE", "-", "05/06/2026", ""]),
      row(["3.", "0-3", "NO DATE", "9,000", "", ""]),
      row(["Total", "", "", "", "", ""]),
    ].join("")}</tbody></table>`;
    assert.deepEqual(parseUnitRateRows(html), [{ locality: "MAIN ROAD", value: 12500, effective: "2026-06-05" }]);
  });

  test("village names with (P) / [P] suffixes still find their own row", () => {
    const rows = [{ locality: "SHAMSHABAD", value: 9000, effective: null }, { locality: "AIRPORT ROAD", value: 30000, effective: null }];
    assert.equal(summariseVillage("SHAMSHABAD (P)", rows, []).land?.general, 9000);
    assert.equal(summariseVillage("PATANCHERU[P]", [{ locality: "PATANCHERU", value: 10200, effective: null }], []).land?.general, 10200);
  });
});

describe("MagicBricks — edge cases", () => {
  test("missing or zero quarters, and fewer than five quarters gives no yearly change", () => {
    const s = parseLocalityData({ locName: "X", activePropType: "10002", graphData: { quarterValues: ["a", "b", "c"], averageRangeValues: [0, 5000, 5200] } }, "apartment", "X")!;
    assert.deepEqual(s.history.map((h) => h.value), [5000, 5200]);
    assert.equal(s.yoyPct, null);
    assert.equal(parseLocalityData({ graphData: {} }, "apartment", "X"), null);
  });

  test("broken embedded JSON is no data, not a crash", () => {
    assert.equal(extractLocalityData('window.__LOCALITY_DATA__ = {"a": [1, 2'), null);
    assert.equal(extractLocalityData('window.__LOCALITY_DATA__ = {"a": }'), null);
  });
});
