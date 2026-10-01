import { test } from "node:test";
import assert from "node:assert/strict";
import { rateProject, horizonFor, median, gradeOf, type RatingInput } from "./rating";

const NOW = new Date("2026-10-01T00:00:00Z");
const base = (o: Partial<RatingInput> = {}): RatingInput => ({
  propertyType: "Apartment", reraRegistered: true, litigation: "No", developerEstablished: 1990,
  lat: 17.40, lng: 78.33, corridorScore: null, possession: "2026-06-01",
  landAcres: 13.5, towers: 6, medianRate: 11000, peerMedianRate: 11500, now: NOW, ...o,
});

test("a strong, ready, RERA project from an established developer near the job hub grades A / LOW risk", () => {
  const r = rateProject(base());
  assert.equal(r.grade, "A");
  assert.equal(r.riskLevel, "LOW");
  assert.equal(r.total, r.components.reduce((s, c) => s + c.points, 0));
});

test("missing RERA forces HIGH risk and costs the legal points", () => {
  const withRera = rateProject(base());
  const without = rateProject(base({ reraRegistered: false }));
  assert.equal(without.riskLevel, "HIGH");
  assert.equal(withRera.total - without.total, 14);
});

test("missing facts take neutral values with an explanatory note (no fabrication)", () => {
  const r = rateProject(base({ developerEstablished: null, possession: null, medianRate: null, lat: null, lng: null }));
  const by = Object.fromEntries(r.components.map((c) => [c.key, c]));
  assert.equal(by.developer.points, 8);
  assert.match(by.developer.note, /not on record/);
  assert.equal(by.delivery.points, 7);
  assert.equal(by.value.points, 5);
  assert.match(by.location.note, /unverified/);
});

test("far-off possession is penalised and pushes risk to HIGH", () => {
  const r = rateProject(base({ possession: "2031-01-01" }));
  assert.equal(r.components.find((c) => c.key === "delivery")!.points, 4);
  assert.equal(r.riskLevel, "HIGH");
});

test("distance from the job hub lowers the location score", () => {
  const near = rateProject(base({ lat: 17.43, lng: 78.36 }));
  const far = rateProject(base({ lat: 17.07, lng: 78.20 })); // Shadnagar
  const loc = (x: typeof near) => x.components.find((c) => c.key === "location")!.points;
  assert.ok(loc(near) > loc(far));
});

test("price below locality median scores better than above", () => {
  const cheap = rateProject(base({ medianRate: 9000, peerMedianRate: 11000 }));
  const dear = rateProject(base({ medianRate: 15000, peerMedianRate: 11000 }));
  const v = (x: typeof cheap) => x.components.find((c) => c.key === "value")!.points;
  assert.equal(v(cheap), 10);
  assert.equal(v(dear), 2);
});

test("grade thresholds", () => {
  assert.equal(gradeOf(80), "A"); assert.equal(gradeOf(65), "B"); assert.equal(gradeOf(50), "C"); assert.equal(gradeOf(49), "D");
});

test("horizon reflects time to possession", () => {
  assert.deepEqual(horizonFor("Apartment", "2026-01-01", NOW), [2, 5]);
  assert.deepEqual(horizonFor("Apartment", "2029-10-01", NOW), [4, 8]);
  assert.deepEqual(horizonFor("Plots", null, NOW), [3, 7]);
});

test("median", () => {
  assert.equal(median([3, 1, 2]), 2);
  assert.equal(median([1, 2, 3, 4]), 2.5);
  assert.equal(median([]), null);
});
