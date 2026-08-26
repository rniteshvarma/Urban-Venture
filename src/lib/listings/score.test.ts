import { test } from "node:test";
import assert from "node:assert/strict";
import {
  locationComponent,
  priceComponent,
  qualityComponent,
  trustComponent,
  freshnessComponent,
  computeListingScore,
  deriveImprovements,
  gradeFor,
  type ListingScoreInput,
} from "./score";

const NOW = new Date("2026-08-24T00:00:00Z");
const daysAgo = (d: number) => new Date(NOW.getTime() - d * 86_400_000);

function baseInput(over: Partial<ListingScoreInput> = {}): ListingScoreInput {
  return {
    villageLandIQScore: null,
    corridorOverallScore: null,
    askingRatePerSqYd: null,
    fairValueP50PerSqYd: null,
    photoCount: 0,
    hasLayoutOrFloorPlan: false,
    descriptionLength: 0,
    descriptionIsBoilerplate: false,
    requiredFieldsComplete: false,
    hasPlotDimensions: false,
    hasVideo: false,
    approvalVerified: false,
    ownershipDocApproved: false,
    reraVerifiedOrNotRequired: false,
    sellerVerified: false,
    lastRefreshedAt: null,
    respondedEnquiries: 0,
    totalEnquiries: 0,
    lastEditedAt: null,
    now: NOW,
    ...over,
  };
}

// ── LOCATION ──
test("location: prefers village LandIQ score over corridor", () => {
  const c = locationComponent(baseInput({ villageLandIQScore: 80, corridorOverallScore: 40 }));
  assert.equal(c.points, 24); // 80/100 * 30
  assert.equal(c.confidence, "HIGH");
});

test("location: falls back to corridor score when village absent", () => {
  const c = locationComponent(baseInput({ corridorOverallScore: 50 }));
  assert.equal(c.points, 15);
  assert.equal(c.confidence, "HIGH");
});

test("location: missing data → neutral 15 with LOW confidence (no fabrication)", () => {
  const c = locationComponent(baseInput());
  assert.equal(c.points, 15);
  assert.equal(c.confidence, "LOW");
  assert.match(c.note ?? "", /provisional/i);
});

// ── PRICE ──
test("price: at/below model range scores full 25", () => {
  assert.equal(priceComponent(baseInput({ askingRatePerSqYd: 20000, fairValueP50PerSqYd: 24000 })).points, 25);
  assert.equal(priceComponent(baseInput({ askingRatePerSqYd: 24000, fairValueP50PerSqYd: 24000 })).points, 25);
});

test("price: banded penalties as gap grows", () => {
  assert.equal(priceComponent(baseInput({ askingRatePerSqYd: 27600, fairValueP50PerSqYd: 24000 })).points, 18); // +15%
  assert.equal(priceComponent(baseInput({ askingRatePerSqYd: 30000, fairValueP50PerSqYd: 24000 })).points, 10); // +25%, in 20–40% band
  assert.equal(priceComponent(baseInput({ askingRatePerSqYd: 36000, fairValueP50PerSqYd: 24000 })).points, 3); // >40%
});

test("price: no fair value → neutral 15 LOW", () => {
  const c = priceComponent(baseInput({ askingRatePerSqYd: 30000, fairValueP50PerSqYd: null }));
  assert.equal(c.points, 15);
  assert.equal(c.confidence, "LOW");
});

// ── QUALITY ──
test("quality: photo tiers 5/8/12", () => {
  assert.equal(qualityComponent(baseInput({ photoCount: 4 })).points, 0);
  assert.equal(qualityComponent(baseInput({ photoCount: 5 })).points, 3);
  assert.equal(qualityComponent(baseInput({ photoCount: 8 })).points, 5);
  assert.equal(qualityComponent(baseInput({ photoCount: 12 })).points, 6);
});

test("quality: full 20 with everything present", () => {
  const c = qualityComponent(
    baseInput({
      photoCount: 12,
      hasLayoutOrFloorPlan: true,
      descriptionLength: 300,
      descriptionIsBoilerplate: false,
      requiredFieldsComplete: true,
      hasPlotDimensions: true,
      hasVideo: true,
    }),
  );
  assert.equal(c.points, 20);
});

test("quality: boilerplate description earns no description points", () => {
  const good = qualityComponent(baseInput({ descriptionLength: 300, descriptionIsBoilerplate: false }));
  const boiler = qualityComponent(baseInput({ descriptionLength: 300, descriptionIsBoilerplate: true }));
  assert.equal(good.points - boiler.points, 3);
});

// ── TRUST ──
test("trust: components sum and cap at 15", () => {
  assert.equal(trustComponent(baseInput({ approvalVerified: true })).points, 6);
  const full = trustComponent(
    baseInput({ approvalVerified: true, ownershipDocApproved: true, reraVerifiedOrNotRequired: true, sellerVerified: true }),
  );
  assert.equal(full.points, 15);
});

// ── FRESHNESS ──
test("freshness: fresh refresh + full response + recent edit = 10", () => {
  const c = freshnessComponent(
    baseInput({ lastRefreshedAt: daysAgo(3), respondedEnquiries: 4, totalEnquiries: 4, lastEditedAt: daysAgo(2) }),
  );
  assert.equal(c.points, 10);
});

test("freshness: refresh decays to 0 by 60 days", () => {
  assert.equal(freshnessComponent(baseInput({ lastRefreshedAt: daysAgo(60) })).points, 0);
  assert.ok(freshnessComponent(baseInput({ lastRefreshedAt: daysAgo(37) })).points >= 1); // ~mid decay
});

// ── COMPOSITE + acceptance criteria ──
test("composite total = sum of five integer components, clamped", () => {
  const b = computeListingScore(
    baseInput({ villageLandIQScore: 84, askingRatePerSqYd: 31000, fairValueP50PerSqYd: 23000, photoCount: 6 }),
  );
  assert.equal(b.total, b.location.points + b.price.points + b.quality.points + b.trust.points + b.freshness.points);
  assert.ok(b.total >= 0 && b.total <= 100);
});

test("score changes visibly when price, photos, or documents change", () => {
  const before = computeListingScore(baseInput({ askingRatePerSqYd: 36000, fairValueP50PerSqYd: 24000, photoCount: 5 }));
  const cheaper = computeListingScore(baseInput({ askingRatePerSqYd: 24000, fairValueP50PerSqYd: 24000, photoCount: 5 }));
  const morePhotos = computeListingScore(baseInput({ askingRatePerSqYd: 36000, fairValueP50PerSqYd: 24000, photoCount: 12 }));
  const withDoc = computeListingScore(baseInput({ askingRatePerSqYd: 36000, fairValueP50PerSqYd: 24000, photoCount: 5, ownershipDocApproved: true }));
  assert.ok(cheaper.total > before.total, "lower price should raise score");
  assert.ok(morePhotos.total > before.total, "more photos should raise score");
  assert.ok(withDoc.total > before.total, "verified doc should raise score");
});

test("gradeFor thresholds A/B/C and null below 50", () => {
  assert.equal(gradeFor(85), "A");
  assert.equal(gradeFor(70), "B");
  assert.equal(gradeFor(55), "C");
  assert.equal(gradeFor(40), null);
});

// ── IMPROVEMENTS ──
test("improvements point at real gaps, sorted by points, with values", () => {
  const i = baseInput({ askingRatePerSqYd: 36000, fairValueP50PerSqYd: 24000, photoCount: 6 });
  const b = computeListingScore(i);
  const imp = deriveImprovements(i, b);
  assert.ok(imp.length > 0);
  // sorted descending by points
  for (let k = 1; k < imp.length; k++) assert.ok(imp[k - 1].points >= imp[k].points);
  // the overpriced listing surfaces a price improvement worth the most
  assert.equal(imp[0].key, "price");
  assert.ok(imp[0].points > 0);
});

test("improvements: a maxed-out listing produces none", () => {
  const i = baseInput({
    villageLandIQScore: 90,
    askingRatePerSqYd: 24000,
    fairValueP50PerSqYd: 24000,
    photoCount: 12,
    hasLayoutOrFloorPlan: true,
    descriptionLength: 300,
    requiredFieldsComplete: true,
    hasPlotDimensions: true,
    hasVideo: true,
    approvalVerified: true,
    ownershipDocApproved: true,
    reraVerifiedOrNotRequired: true,
    sellerVerified: true,
  });
  assert.equal(deriveImprovements(i, computeListingScore(i)).length, 0);
});
