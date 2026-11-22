import { test } from "node:test";
import assert from "node:assert/strict";
import { drawSite, parseFloors, siteRadiusM } from "./towers";
import { haversineKm } from "../osm/geo";

const base = { lat: 17.44, lng: 78.35 };

test("apartments: one block per listed tower, height from floors", () => {
  const s = drawSite({ ...base, propertyType: "Apartment", towerCount: 5, floorsPerTower: 20, totalLandAcres: 6 });
  assert.equal(s.kind, "towers");
  assert.equal(s.blocks.length, 5);
  assert.equal(s.blocks[0].heightM, 20 * 3.1 + 4);
  assert.match(s.note, /5 towers × 20 floors/);
  // Every corner stays inside the site disc (plus half a tower's diagonal).
  for (const b of s.blocks) for (const [lng, lat] of b.polygon) assert.ok(haversineKm(base.lat, base.lng, lat, lng) * 1000 < s.siteRadiusM + 25);
});

test("apartments without a tower count get no invented towers", () => {
  const s = drawSite({ ...base, propertyType: "Apartment", floorsPerTower: 14 });
  assert.equal(s.kind, "site-only");
  assert.equal(s.blocks.length, 0);
});

test("missing floor count is said out loud", () => {
  const s = drawSite({ ...base, propertyType: "Apartment", towerCount: 1 });
  assert.match(s.note, /floor count not listed/);
  assert.match(s.note, /1 tower from/);
});

test("villas draw low houses; plots and land only mark the site", () => {
  assert.equal(drawSite({ ...base, propertyType: "Villa", totalUnits: 40 }).blocks.length, 40);
  assert.equal(drawSite({ ...base, propertyType: "Villa", totalUnits: 40 }).blocks[0].heightM, 9);
  const plot = drawSite({ ...base, propertyType: "Plots", totalLandAcres: 12 });
  assert.equal(plot.kind, "site-only");
  assert.match(plot.note, /Open land/);
});

test("site radius follows land area within bounds", () => {
  assert.equal(siteRadiusM(null), 90);
  assert.ok(Math.abs(siteRadiusM(10) - Math.sqrt((10 * 4046.86) / Math.PI)) < 1e-9);
  assert.equal(siteRadiusM(5000), 450);
  assert.equal(siteRadiusM(0.01), 35);
});

test("floor descriptions as listed", () => {
  assert.equal(parseFloors("Stilt+21 Floors"), 22);
  assert.equal(parseFloors("Stilt + 42 Floor"), 43);
  assert.equal(parseFloors("G+4P+14"), 19);
  assert.equal(parseFloors("2B+G+14"), 15);
  assert.equal(parseFloors("Basement+Ground+5 Floors"), 6);
  assert.equal(parseFloors("10 Floors"), 10);
  assert.equal(parseFloors("G+2"), 3);
  assert.equal(parseFloors("5"), 5);
  assert.equal(parseFloors("Ground"), null);
  assert.equal(parseFloors(""), null);
  assert.equal(parseFloors(null), null);
  const s = drawSite({ lat: 17.44, lng: 78.35, propertyType: "Apartment", towerCount: 2, floorsPerTower: "Stilt+21 Floors" });
  assert.match(s.note, /2 towers × 22 floors \(listed as “Stilt\+21 Floors”\)/);
});
