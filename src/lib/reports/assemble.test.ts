import { test } from "node:test";
import assert from "node:assert/strict";
import {
  runFallbackLadder, buildMatched, buildNearMisses, buildAreaIntel, pickTopThree,
  materialSignature, entityHash, matchesAnyType,
} from "./assemble";
import type { GatheredData, PropertyCand, CorridorSnapshot, RecentItem } from "./types";

const NOW = new Date("2026-09-18T00:00:00Z");
const daysAgo = (d: number) => new Date(NOW.getTime() - d * 86_400_000);

function prop(over: Partial<PropertyCand> = {}): PropertyCand {
  return {
    id: over.id ?? "p1",
    name: "Plot",
    corridorSlug: "kadthal",
    propertyType: "Plots",
    priceLakh: 60,
    rateValue: 25000,
    rateUnit: "sq.yd",
    areaValue: 267,
    areaUnit: "sq.yd",
    listingScore: 78,
    listingSource: "SELLER",
    approvalStatus: "HMDA_APPROVED",
    approvalVerified: true,
    mediaCount: 6,
    thumb: null,
    createdAt: daysAgo(2),
    fairValueMidRate: 27000,
    ...over,
  };
}

function area(over: Partial<CorridorSnapshot> = {}): CorridorSnapshot {
  return { slug: "kadthal", name: "Kadthal", overallScore: 81, plotPriceMidSqYd: 22600, newListings: 3, prevScore: 78, prevPriceMidSqYd: 22000, ...over };
}

function data(over: Partial<GatheredData> = {}): GatheredData {
  return {
    pref: { city: "Hyderabad", budgetMinLakh: 25, budgetMaxLakh: 80, areaSlugs: ["kadthal", "adibatla"], propertyTypes: ["PLOT"], horizonYears: 5 },
    approvedProperties: [],
    watchedAreas: [area()],
    adjacency: {},
    adjacentProperties: [],
    newApprovals: [],
    infraMilestones: [],
    legalFlags: [],
    marketPulse: null,
    topMovers: [],
    recentItems: [],
    ...over,
  };
}

// ── Type matching ──
test("type matching: 'Plots' matches PLOT but not FARM_PLOT", () => {
  assert.equal(matchesAnyType("Plots", ["PLOT"]), true);
  assert.equal(matchesAnyType("Farm Plot", ["PLOT"]), false);
  assert.equal(matchesAnyType("Farm Plot", ["FARM_PLOT"]), true);
  assert.equal(matchesAnyType("anything", []), true); // no filter = all
});

// ── LEVEL 1 ──
test("L1: exact matches filtered by budget/type/area and sorted by score, capped at 6", () => {
  const props = [
    prop({ id: "a", listingScore: 60 }),
    prop({ id: "b", listingScore: 90 }),
    prop({ id: "c", corridorSlug: "vikarabad" }), // outside watched areas
    prop({ id: "d", priceLakh: 200 }), // over budget
    prop({ id: "e", propertyType: "Villa" }), // wrong type
  ];
  const { views } = buildMatched(data({ approvedProperties: props }), NOW);
  assert.deepEqual(views.map((v) => v.id), ["b", "a"]); // only a,b qualify; sorted desc
});

test("L1: a property sent within 28 days with unchanged state is suppressed", () => {
  const p = prop({ id: "a" });
  const hash = entityHash("MATCHED_PROPERTY", "a", materialSignature(p));
  const recent: RecentItem[] = [{ itemType: "MATCHED_PROPERTY", entityId: "a", entityHash: hash, includedAt: daysAgo(7) }];
  const { views } = buildMatched(data({ approvedProperties: [p], recentItems: recent }), NOW);
  assert.equal(views.length, 0);
});

test("L1: a materially-changed property (>5% price move) is included again", () => {
  const old = prop({ id: "a", priceLakh: 60 });
  const oldHash = entityHash("MATCHED_PROPERTY", "a", materialSignature(old));
  const recent: RecentItem[] = [{ itemType: "MATCHED_PROPERTY", entityId: "a", entityHash: oldHash, includedAt: daysAgo(7) }];
  const changed = prop({ id: "a", priceLakh: 68 }); // +13%
  const { views } = buildMatched(data({ approvedProperties: [changed], recentItems: recent }), NOW);
  assert.equal(views.length, 1);
});

test("L1: a below-model property is flagged as a PRICE_DROP with top weight", () => {
  const cheap = prop({ id: "a", rateValue: 22000, fairValueMidRate: 27000 }); // ~18% below
  const { produced } = buildMatched(data({ approvedProperties: [cheap] }), NOW);
  assert.equal(produced[0].item.itemType, "PRICE_DROP");
  assert.equal(produced[0].weight, 100);
});

// ── LEVEL 2 ──
test("L2: budget-relaxed near miss is labelled 'Slightly above your range'", () => {
  const over = prop({ id: "x", priceLakh: 92 }); // >max*1.1(88), within max*1.25(100)
  const { views } = buildNearMisses(data({ approvedProperties: [over] }), NOW);
  assert.equal(views.length, 1);
  assert.equal(views[0].relaxedLabel, "Slightly above your range");
});

test("L2: never relaxes more than one dimension (wrong type AND over budget → excluded)", () => {
  const twoOff = prop({ id: "x", priceLakh: 92, propertyType: "Villa" });
  const { views } = buildNearMisses(data({ approvedProperties: [twoOff] }), NOW);
  assert.equal(views.length, 0);
});

test("L2: type-relaxed near miss (farm plot when watching plots) is labelled honestly", () => {
  const farm = prop({ id: "x", propertyType: "Farm Plot", priceLakh: 60 });
  const { views } = buildNearMisses(data({ approvedProperties: [farm] }), NOW);
  assert.equal(views.length, 1);
  assert.match(views[0].relaxedLabel ?? "", /close to what you watch/);
});

// ── LEVEL 3 ──
test("L3: area score move is reported when the value changed", () => {
  const { produced } = buildAreaIntel(data({ watchedAreas: [area({ overallScore: 81, prevScore: 78 })] }));
  const move = produced.find((p) => p.item.itemType === "AREA_SCORE_MOVE");
  assert.ok(move);
  assert.equal(move!.weight, 45); // 81-78 = 3 points → below the ≥4 threshold, so 45
  // a ≥4-point move earns the full 80
  const big = buildAreaIntel(data({ watchedAreas: [area({ overallScore: 83, prevScore: 78 })] })).produced.find((p) => p.item.itemType === "AREA_SCORE_MOVE");
  assert.equal(big!.weight, 80);
});

test("L3: an unchanged area value is suppressed (no noise)", () => {
  const a = area({ overallScore: 80, prevScore: 78 });
  // last report already carried score 80
  const hash = entityHash("AREA_SCORE_MOVE", "kadthal", "sc80");
  const recent: RecentItem[] = [{ itemType: "AREA_SCORE_MOVE", entityId: "kadthal", entityHash: hash, includedAt: daysAgo(7) }];
  const { produced } = buildAreaIntel(data({ watchedAreas: [a], recentItems: recent }));
  assert.equal(produced.filter((p) => p.item.itemType === "AREA_SCORE_MOVE").length, 0);
});

// ── Zero inventory (the critical case) ──
test("zero properties → report is never empty; area+market carry it", () => {
  const d = data({
    approvedProperties: [],
    watchedAreas: [area({ slug: "kadthal", name: "Kadthal", overallScore: 81, prevScore: 78 }), area({ slug: "adibatla", name: "Adibatla", overallScore: 84, prevScore: 80, plotPriceMidSqYd: 27000, prevPriceMidSqYd: 26000 })],
    newApprovals: [{ id: "ap1", approvalNumber: "LP-2489/2026", approvalType: "HMDA", corridorSlug: "kadthal", corridorName: "Kadthal", areaAcres: 32, approvalDate: daysAgo(3) }],
    infraMilestones: [{ id: "inf1", projectShortName: "RRR North", category: "ROAD_HIGHWAY", title: "Package 3 tender awarded", date: daysAgo(2), description: "movement", affectedSlugs: ["kadthal"], affectedNames: ["Kadthal"] }],
    marketPulse: { period: "FY2026", totalRegistrations: 51089, yoyGrowthPct: 40, avgAskingPriceSqFt: 9430, source: "Knight Frank" },
  });
  const r = runFallbackLadder(d, NOW);
  assert.equal(r.content.matched.length, 0);
  assert.ok(r.itemCount >= 3, `expected >=3 items, got ${r.itemCount}`);
  assert.ok(r.fallbackLevel >= 3, `expected fallbackLevel>=3, got ${r.fallbackLevel}`);
  assert.ok(r.topThree.length >= 1);
});

// ── Top three ──
test("top three enforces at least two distinct item types", () => {
  const d = data({
    approvedProperties: [prop({ id: "a", rateValue: 21000, fairValueMidRate: 27000 }), prop({ id: "b", rateValue: 21500, fairValueMidRate: 27000 }), prop({ id: "c", rateValue: 20000, fairValueMidRate: 27000 })],
    infraMilestones: [{ id: "inf1", projectShortName: "RRR North", category: "ROAD_HIGHWAY", title: "tender awarded", date: daysAgo(1), description: null, affectedSlugs: ["kadthal"], affectedNames: ["Kadthal"] }],
  });
  const r = runFallbackLadder(d, NOW);
  assert.equal(r.topThree.length, 3);
  assert.ok(new Set(r.topThree.map((t) => t.type)).size >= 2, "top three must not be all one type");
});

test("pickTopThree returns highest-weight items first", () => {
  const t = pickTopThree([
    { item: { itemType: "MARKET_STAT", entityId: "m", entityHash: "h", section: "s", position: 0 }, weight: 30, top3: { type: "MARKET_STAT", title: "m", subtitle: "", value: "" } },
    { item: { itemType: "PRICE_DROP", entityId: "p", entityHash: "h", section: "s", position: 0 }, weight: 100, top3: { type: "PRICE_DROP", title: "p", subtitle: "", value: "" } },
    { item: { itemType: "INFRA_MILESTONE", entityId: "i", entityHash: "h", section: "s", position: 0 }, weight: 85, top3: { type: "INFRA_MILESTONE", title: "i", subtitle: "", value: "" } },
  ]);
  assert.deepEqual(t.map((x) => x.type), ["PRICE_DROP", "INFRA_MILESTONE", "MARKET_STAT"]);
});

// ── material signature ──
test("materialSignature: a >5% price move changes the signature; a tiny move may not", () => {
  assert.notEqual(materialSignature(prop({ priceLakh: 100 })), materialSignature(prop({ priceLakh: 110 })));
  assert.notEqual(materialSignature(prop({ listingScore: 72 })), materialSignature(prop({ listingScore: 78 })));
  assert.notEqual(materialSignature(prop({ approvalVerified: false })), materialSignature(prop({ approvalVerified: true })));
});
