import { test } from "node:test";
import assert from "node:assert/strict";
import { scoreListing, bandOf, MIN_LENSES, type ScoreInput } from "./lenses";

const NOW = new Date("2026-11-12T00:00:00Z");
const part = (points: number, max: number, note = "x") => ({ points, max, note });

const project: ScoreInput = {
  kind: "PROJECT",
  propertyType: "Apartment",
  reraRegistered: true,
  litigation: "No",
  criminalCase: false,
  revoked: false,
  layoutStated: false,
  builder: { name: "Acme", established: 2000, projects: 8, withReraDeadline: 6, overdue: 0, extended: 1, regulatoryOrders: 0 },
  ready: false,
  monthsToPossession: 20,
  overdue: false,
  rate: 8000,
  rateUnit: "sq.ft",
  peerMedianRate: 8500,
  peerCount: 12,
  zone: "Tellapur",
  access: {
    connectivity: part(28, 35),
    daily: part(24, 30),
    jobs: part(16, 20),
    green: part(12, 15),
    hospitalKm: 1.2,
    lakeKm: 1.5,
    lakeName: "Big Lake",
    watchOuts: [],
  },
  approxPin: false,
  area: { name: "Kokapet", infraScore: 15, baseCagr5: 7 },
  now: NOW,
};

test("a well-documented project gets a score from all eight lenses", () => {
  const r = scoreListing(project);
  assert.equal(r.measured, 8);
  assert.ok(r.score != null && r.score >= 7 && r.score <= 10, `score ${r.score}`);
  assert.equal(r.band, bandOf(r.score!));
  assert.deepEqual(r.caps, []);
  for (const l of r.lenses) assert.ok(l.score! >= 0 && l.score! <= 100);
});

test("missing data is shown as missing, never filled with a middle value", () => {
  const r = scoreListing({ ...project, access: null });
  const missing = r.lenses.filter((l) => l.status === "no-data").map((l) => l.key).sort();
  assert.deepEqual(missing, ["living", "safety", "transit"]);
  for (const l of r.lenses.filter((x) => x.status === "no-data")) assert.equal(l.score, null);
  assert.equal(r.measured, 5);
  assert.notEqual(r.score, null, "five lenses are still enough");
});

test("fewer than the minimum lenses means no score at all", () => {
  const r = scoreListing({ ...project, access: null, area: null, rate: null });
  assert.ok(r.measured < MIN_LENSES);
  assert.equal(r.score, null);
  assert.equal(r.band, null);
});

test("no RERA registration caps the score at 5.0", () => {
  const r = scoreListing({ ...project, reraRegistered: false });
  assert.ok(r.score! <= 5);
  assert.equal(r.caps.length, 1);
});

test("a revoked registration or declared criminal case caps at 4.0", () => {
  assert.ok(scoreListing({ ...project, revoked: true }).score! <= 4);
  assert.ok(scoreListing({ ...project, criminalCase: true }).score! <= 4);
});

test("land listings: builder lens doesn't apply, and the score is capped at 6.0", () => {
  const r = scoreListing({ ...project, kind: "LAND", propertyType: "Land", builder: null, reraRegistered: false, litigation: null, layoutStated: true });
  const b = r.lenses.find((l) => l.key === "builder")!;
  assert.equal(b.status, "not-applicable");
  assert.ok(r.score! <= 6);
  assert.match(r.lenses.find((l) => l.key === "regulations")!.note, /not verified/);
});

test("value for money rewards a lower price than similar listings, penalises a higher one", () => {
  const cheap = scoreListing({ ...project, rate: 7000 }).lenses.find((l) => l.key === "value")!;
  const dear = scoreListing({ ...project, rate: 11500 }).lenses.find((l) => l.key === "value")!;
  assert.ok(cheap.score! > dear.score!);
  assert.match(cheap.note, /below the median/);
  assert.match(dear.note, /above the median/);
  const thin = scoreListing({ ...project, peerCount: 2 }).lenses.find((l) => l.key === "value")!;
  assert.equal(thin.score, null, "needs at least 3 comparable listings");
});

test("safety: a pin inside a lake buffer and a power line both cost points", () => {
  const clean = scoreListing(project).lenses.find((l) => l.key === "safety")!;
  const risky = scoreListing({
    ...project,
    access: { ...project.access!, watchOuts: [{ key: "lake", label: "Pin falls inside Big Lake" }, { key: "power_line", label: "Power line 50 m away" }] },
  }).lenses.find((l) => l.key === "safety")!;
  assert.equal(clean.score, 100);
  assert.ok(risky.score! <= 35);
  assert.match(risky.note, /Big Lake/);
});

test("builder lens: past the RERA date scores lower than ready to move", () => {
  const ready = scoreListing({ ...project, ready: true }).lenses.find((l) => l.key === "builder")!;
  const late = scoreListing({ ...project, overdue: true }).lenses.find((l) => l.key === "builder")!;
  assert.ok(ready.score! > late.score!);
  assert.match(late.note, /past its RERA completion date/);
});

test("bands", () => {
  assert.equal(bandOf(8.2), "Excellent");
  assert.equal(bandOf(7.0), "Very good");
  assert.equal(bandOf(6.4), "Good");
  assert.equal(bandOf(5.0), "Fair");
  assert.equal(bandOf(3.9), "Weak");
});
