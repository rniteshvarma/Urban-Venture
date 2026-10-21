import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { emi, kindOf, purchaseCosts } from "./costs";
import { checklistFor } from "./checklist";

describe("purchase costs in Telangana", () => {
  test("municipal area: 5.5% stamp + 1.5% transfer + 0.5% registration = 7.5%", () => {
    const c = purchaseCosts({ priceLakh: 100, kind: "apartment", underConstruction: false });
    assert.deepEqual([c.stampDutyLakh, c.transferDutyLakh, c.registrationLakh, c.gstLakh], [5.5, 1.5, 0.5, 0]);
    assert.equal(c.totalLakh, 107.5);
  });
  test("gram panchayat: 2% registration and no transfer duty, still 7.5%", () => {
    const c = purchaseCosts({ priceLakh: 100, kind: "plot", underConstruction: false, gramPanchayat: true });
    assert.equal(c.transferDutyLakh, 0);
    assert.equal(c.registrationLakh, 2);
    assert.equal(c.totalLakh, 107.5);
  });
  test("duty is on the guidance value when that's higher", () => {
    assert.equal(purchaseCosts({ priceLakh: 50, kind: "plot", underConstruction: false, guidanceLakh: 60 }).stampDutyLakh, 3.3);
  });
  test("GST: 5% under construction, 1% only when affordable on both price and carpet area, none on plots", () => {
    assert.equal(purchaseCosts({ priceLakh: 80, kind: "apartment", underConstruction: true }).gstLakh, 4);
    assert.equal(purchaseCosts({ priceLakh: 40, kind: "apartment", underConstruction: true, carpetSqm: 55 }).gstPct, 1);
    assert.equal(purchaseCosts({ priceLakh: 40, kind: "apartment", underConstruction: true, carpetSqm: 70 }).gstPct, 5);
    assert.equal(purchaseCosts({ priceLakh: 40, kind: "apartment", underConstruction: true }).gstPct, 5);
    assert.equal(purchaseCosts({ priceLakh: 40, kind: "plot", underConstruction: true }).gstLakh, 0);
    assert.equal(purchaseCosts({ priceLakh: 40, kind: "commercial", underConstruction: true }).gstLakh, null);
  });
  test("EMI", () => {
    assert.equal(emi(50, 8.5, 20), 43391);
    assert.equal(emi(12, 0, 1), 100000);
    assert.equal(emi(0, 8.5, 20), 0);
  });
  test("kinds and checklists", () => {
    assert.equal(kindOf("Plots", "LAND_LISTING"), "plot");
    assert.equal(kindOf("Land", "LAND_LISTING"), "land");
    assert.equal(kindOf("Villa"), "villa");
    assert.equal(checklistFor("plot", true).label, "Resale plot");
    assert.ok(checklistFor("land", true).items.some((i) => /Bhu Bharati/.test(i.title)));
  });
});

import { validateVisitRequest } from "./site-visit";
describe("site visit requests", () => {
  const now = new Date("2026-10-21T10:00:00+05:30");
  const ok = { name: "Asha", phone: "98480 12345", date: "2026-10-25", slot: "MORNING" };
  test("valid request", () => assert.equal(validateVisitRequest(ok, now).ok, true));
  test("date must be tomorrow to two months out", () => {
    assert.equal(validateVisitRequest({ ...ok, date: "2026-10-21" }, now).ok, false);
    assert.equal(validateVisitRequest({ ...ok, date: "2026-10-22" }, now).ok, true);
    assert.equal(validateVisitRequest({ ...ok, date: "2027-01-30" }, now).ok, false);
  });
  test("phone, slot and email are checked", () => {
    assert.equal(validateVisitRequest({ ...ok, phone: "123" }, now).ok, false);
    assert.equal(validateVisitRequest({ ...ok, slot: "NIGHT" }, now).ok, false);
    assert.equal(validateVisitRequest({ ...ok, email: "nope" }, now).ok, false);
  });
});

import { alertEmailHtml, priceChanged } from "./alerts";
import { describeFilters, projectWhere } from "../projects/query";
describe("buyer alerts", () => {
  test("price changes worth telling: at least 1% and ₹50,000", () => {
    assert.equal(priceChanged(100, 99), true);
    assert.equal(priceChanged(100, 99.6), false);
    assert.equal(priceChanged(20, 19.6), false);
    assert.equal(priceChanged(null, 50), false);
  });
  test("the email lists matches per search with its own unsubscribe link, and price moves", () => {
    const html = alertEmailHtml({
      name: "Asha <script>",
      searches: [{ label: "Plots · Kokapet", unsubscribe: "https://x/unsub?key=k1", projects: [{ id: "p1", name: "Green Acres", locality: "Kokapet", price: 45 }] }, { label: "Empty", unsubscribe: "u2", projects: [] }],
      changes: [{ id: "p2", name: "Sky", from: 100, to: 95 }],
    });
    assert.match(html, /1 new for “Plots · Kokapet”/);
    assert.match(html, /unsub\?key=k1/);
    assert.ok(!html.includes("Empty"));
    assert.match(html, /₹1 Cr → <b>₹95 L<\/b>/);
    assert.ok(!html.includes("<script>"));
  });
  test("saved-search filters use the same query as the feed", () => {
    const w = projectWhere({ type: "Apartment", minBudget: 30, maxBudget: 60 });
    assert.deepEqual(w.propertyType, { in: ["Apartment", "Residential"] });
    assert.equal(describeFilters({ type: "Plots", locality: "Kokapet", minBudget: 30, maxBudget: 60 }), "Plots · Kokapet · ₹30–60 L");
    assert.equal(describeFilters({}), "All projects");
  });
});
