import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { areaUnitFor, listingArea, ratePerUnit } from "./units";

describe("area units", () => {
  test("land is in sq.yd, built property in sq.ft", () => {
    for (const t of ["Plots", "Land", "Open Plot", "Villa Plot", "Commercial Plot", "Farm Land"]) assert.equal(areaUnitFor(t), "SQYD", t);
    for (const t of ["Apartment", "Villa", "Commercial", "Independent House", "Office"]) assert.equal(areaUnitFor(t), "SQFT", t);
    assert.equal(areaUnitFor(null), "SQYD");
  });

  test("a listing's area comes from the column for its unit", () => {
    assert.deepEqual(listingArea({ propertyType: "Apartment", totalAreaSqYd: 200, totalAreaSqFt: 1650 }), { value: 1650, unit: "SQFT" });
    assert.deepEqual(listingArea({ propertyType: "Plots", totalAreaSqYd: 200, totalAreaSqFt: 1650 }), { value: 200, unit: "SQYD" });
    assert.deepEqual(listingArea({ propertyType: "Villa", totalAreaSqYd: 300, totalAreaSqFt: null }), { value: null, unit: "SQFT" });
  });

  test("rate per unit from a lakh price", () => {
    assert.equal(ratePerUnit(132, 1650), 8000); // ₹1.32 Cr for 1,650 sq.ft
    assert.equal(ratePerUnit(60, 200), 30000); // ₹60 L for 200 sq.yd
    assert.equal(ratePerUnit(60, null), null);
    assert.equal(ratePerUnit(0, 200), null);
  });
});
