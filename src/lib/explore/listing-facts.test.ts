import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { listingFacts } from "./query";

const u = (bedrooms: number | null, areaSqFt: number | null, areaSqYd: number | null = null) => ({ bedrooms, areaSqFt, areaSqYd });

describe("list card facts", () => {
  test("apartment: BHK mix and a sq.ft range", () => {
    assert.deepEqual(listingFacts({ propertyType: "Apartment", unitTypes: [u(3, 1650), u(2, 1180), u(3, 1800)] }), { bhk: "2, 3 BHK", size: "1,180–1,800 sq.ft" });
  });
  test("plots: sizes in sq.yd, no BHK", () => {
    assert.deepEqual(listingFacts({ propertyType: "Plots", unitTypes: [u(null, 1350, 150), u(null, 2700, 300)] }), { bhk: null, size: "150–300 sq.yd" });
  });
  test("single size shows once", () => {
    assert.deepEqual(listingFacts({ propertyType: "Villa", unitTypes: [u(4, 3200), u(4, 3200)] }), { bhk: "4 BHK", size: "3,200 sq.ft" });
  });
  test("seller listing without unit types falls back to its total area", () => {
    assert.deepEqual(listingFacts({ propertyType: "Apartment", totalAreaSqFt: 1650, unitTypes: [] }), { bhk: null, size: "1,650 sq.ft" });
    assert.deepEqual(listingFacts({ propertyType: "Land", totalAreaSqYd: 9680, unitTypes: [] }), { bhk: null, size: "2 acres" });
  });
});
