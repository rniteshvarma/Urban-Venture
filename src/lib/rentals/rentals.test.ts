import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { measureRent, parseNoBrokerRentPage, type RentalListing } from "./rentals";

const C = { lat: 17.44, lng: 78.36 };
const L = (id: number, rent: number, size: number, km: number, extra: Partial<RentalListing> = {}): RentalListing => ({
  id: `t:${id}`, rent, sizeSqft: size, bhk: 2, lat: C.lat + km / 110.574, lng: C.lng, furnishing: "SEMI", letOut: false, updatedAt: null, ...extra,
});

describe("NoBroker rent pages", () => {
  const rows = parseNoBrokerRentPage(readFileSync(path.join(__dirname, "fixtures", "nobroker-rent-gachibowli.html"), "utf8"));
  test("apartment rent listings with size, BHK, location and let-out status", () => {
    assert.ok(rows.length >= 8, String(rows.length));
    const first = rows[0];
    assert.equal(first.rent, 55000);
    assert.equal(first.sizeSqft, 1750);
    assert.equal(first.bhk, 3);
    assert.equal(first.letOut, true);
    assert.equal(first.furnishing, "SEMI");
    assert.ok(first.id.startsWith("nobroker:"));
  });
  test("rooms below 300 sq.ft and mismarked listings are dropped", () => {
    assert.ok(rows.every((r) => r.sizeSqft >= 300));
    assert.deepEqual(parseNoBrokerRentPage("<html>nothing</html>"), []);
  });
});

describe("corridor rent and yield", () => {
  test("median rent per sq.ft and gross yield against the corridor price", () => {
    const ls = Array.from({ length: 20 }, (_, i) => L(i, 30_000 + i * 1000, 1000, 1)); // ₹30–49/sq.ft
    const r = measureRent(C, ls, 10_000)!;
    assert.equal(r.listings, 20);
    assert.equal(r.rentSqftMedian, 39.5);
    assert.equal(r.grossYield, 4.7); // 39.5 × 12 ÷ 10,000
    assert.equal(r.confidence, "MEDIUM");
    assert.equal(r.radiusKm, 5);
    assert.deepEqual(r.byBhk.map((b) => b.bhk), [2]);
  });

  test("fully furnished flats are excluded; listings far away don't count", () => {
    const ls = [
      ...Array.from({ length: 16 }, (_, i) => L(i, 30_000, 1000, 2)),
      ...Array.from({ length: 10 }, (_, i) => L(100 + i, 90_000, 1000, 2, { furnishing: "FULL" })),
      ...Array.from({ length: 10 }, (_, i) => L(200 + i, 5_000, 1000, 40)),
    ];
    const r = measureRent(C, ls, 10_000)!;
    assert.equal(r.listings, 16);
    assert.equal(r.rentSqftMedian, 30);
  });

  test("too few listings is no figure; no price means rent without a yield", () => {
    assert.equal(measureRent(C, Array.from({ length: 5 }, (_, i) => L(i, 30_000, 1000, 1)), 10_000), null);
    const r = measureRent(C, Array.from({ length: 9 }, (_, i) => L(i, 30_000, 1000, 1)), null)!;
    assert.equal(r.confidence, "LOW");
    assert.equal(r.grossYield, null);
  });
});
