// Edge cases for rental listing parsing and rent / yield measurement.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { measureRent, parseNoBrokerRentPage, type RentalListing } from "./rentals";

const page = (items: object[]) => `<script>x = {"rentListPage":{"listPageProperties":${JSON.stringify(items)}}}</script>`;
const ok = { id: "a", rent: 20000, propertySize: 1000, type: "BHK2", buildingType: "AP", latitude: 17.4, longitude: 78.4, furnishing: "SEMI_FURNISHED", inactiveReason: null, propertyType: "RENT" };

describe("rent listing parsing — edge cases", () => {
  test("studios (RK1) and 4+ BHK", () => {
    const rows = parseNoBrokerRentPage(page([{ ...ok, id: "s", type: "RK1", propertySize: 400, rent: 9000 }, { ...ok, id: "b", type: "BHK4PLUS" }]));
    assert.deepEqual(rows.map((r) => r.bhk), [0, 4]);
  });
  test("houses, sale listings, shared rooms, bad coordinates and mismarked listings are dropped", () => {
    const rows = parseNoBrokerRentPage(page([
      { ...ok, id: "h", buildingType: "IH" },
      { ...ok, id: "sale", propertyType: "BUY" },
      { ...ok, id: "pg", sharedAccomodation: true },
      { ...ok, id: "geo", latitude: null },
      { ...ok, id: "bad", inactiveReason: "INCORRECT" },
      { ...ok, id: "keep" },
    ]));
    assert.deepEqual(rows.map((r) => r.id), ["nobroker:keep"]);
  });
  test("rent typed per year or a typo'd size are dropped by the sanity bands", () => {
    const rows = parseNoBrokerRentPage(page([{ ...ok, id: "yr", rent: 2_400_000 }, { ...ok, id: "sz", propertySize: 12 }, { ...ok, id: "lo", rent: 1000 }]));
    assert.deepEqual(rows, []);
  });
  test("a page whose JSON is cut off is no data, not a crash", () => {
    assert.deepEqual(parseNoBrokerRentPage('"listPageProperties":[{"id":"a","rent":'), []);
  });
});

describe("rent measurement — edge cases", () => {
  const C = { lat: 17.44, lng: 78.36 };
  const L = (i: number, km: number, rent = 30000): RentalListing => ({ id: `t${i}`, rent, sizeSqft: 1000, bhk: 2, lat: C.lat + km / 110.574, lng: C.lng, furnishing: "SEMI", letOut: i % 2 === 0, updatedAt: null });

  test("the radius widens to 8 then 12 km until there are enough listings, and says so", () => {
    const r8 = measureRent(C, Array.from({ length: 16 }, (_, i) => L(i, 7)), 10000)!;
    assert.equal(r8.radiusKm, 8);
    const r12 = measureRent(C, Array.from({ length: 10 }, (_, i) => L(i, 11)), 10000)!;
    assert.equal(r12.radiusKm, 12);
    assert.equal(r12.confidence, "LOW");
  });
  test("nothing within 12 km is no figure", () => {
    assert.equal(measureRent(C, Array.from({ length: 50 }, (_, i) => L(i, 20)), 10000), null);
  });
  test("let-out count and the yield range come from the same listings", () => {
    const r = measureRent(C, Array.from({ length: 20 }, (_, i) => L(i, 1, 20000 + i * 1000)), 10000)!;
    assert.equal(r.letOut, 10);
    assert.ok(r.grossYieldRange![0] <= r.grossYield! && r.grossYield! <= r.grossYieldRange![1]);
  });
  test("BHK medians need at least three listings of that size", () => {
    const ls = [...Array.from({ length: 15 }, (_, i) => L(i, 1)), { ...L(99, 1), bhk: 3 }, { ...L(98, 1), bhk: 3 }];
    assert.deepEqual(measureRent(C, ls, 10000)!.byBhk.map((b) => b.bhk), [2]);
  });
});
