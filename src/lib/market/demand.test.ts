import { test } from "node:test";
import assert from "node:assert/strict";
import { aggregateDemand, type DemandEvent } from "./demand";

const ev = (buyer: string, area: string | null, type: string | null = "Apartment", budgetLakh: number | null = null): DemandEvent => ({ buyer, area, type, budgetLakh });

test("nothing is published below the minimum number of buyers", () => {
  const r = aggregateDemand([ev("a", "Kokapet"), ev("b", "Kokapet")], { minTotal: 30 });
  assert.equal(r.enough, false);
  assert.deepEqual(r.areas, []);
});

test("buyers are counted once per area, however many actions they take", () => {
  const events = [...Array(10)].map(() => ev("same", "Kokapet")).concat([ev("x", "Kokapet"), ev("y", "Tellapur")]);
  const r = aggregateDemand(events, { minTotal: 1, minPerArea: 1 });
  assert.equal(r.buyers, 3);
  assert.deepEqual(r.areas.find((a) => a.area === "Kokapet"), { area: "Kokapet", buyers: 2, share: 67 });
});

test("areas with too few buyers are hidden, the rest sorted", () => {
  const events = [...Array(6)].map((_, i) => ev(`k${i}`, "Kokapet")).concat([...Array(3)].map((_, i) => ev(`t${i}`, "Tellapur")));
  const r = aggregateDemand(events, { minTotal: 5, minPerArea: 5 });
  assert.deepEqual(r.areas.map((a) => a.area), ["Kokapet"]);
});

test("budget bands use each buyer's highest stated budget", () => {
  const events = [...Array(5)].flatMap((_, i) => [ev(`b${i}`, "Kokapet", "Apartment", 40), ev(`b${i}`, "Kokapet", "Apartment", 120)]);
  const r = aggregateDemand(events, { minTotal: 5, minPerArea: 5 });
  assert.deepEqual(r.budgets, [{ band: "₹1 Cr – ₹2 Cr", buyers: 5, share: 100 }]);
});
