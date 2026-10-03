import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { closeness, computeAccessibility, type PlaceIndex, type PointPlace } from "./accessibility";
import { circleRing, distanceToRingKm, haversineKm, insideRing, ringAreaHa, type Ring } from "./geo";

const LAT = 17.4, LNG = 78.4;
// A place `km` north of the test pin.
const north = (km: number, name: string, extra: Partial<PointPlace> = {}): PointPlace => ({ id: `${name}-${km}`, name, lat: LAT + km / 110.574, lng: LNG, ...extra });
const empty = (): PlaceIndex => ({
  hospital: [], transit: [], orr_exit: [], bus_station: [], airport: [], school: [], college: [], mall: [],
  job_hub: [], park: [], landfill: [], quarry: [], sewage: [], lake: [], power_line: [],
});

function wellServed(): PlaceIndex {
  const idx = empty();
  idx.hospital = [north(0.5, "Care Hospital"), north(1.5, "City Hospital"), north(3, "General Hospital"), north(4, "Clinic Hospital")];
  idx.transit = [north(0.8, "Raidurg", { sub: "metro" })];
  idx.orr_exit = [north(1.5, "ORR Exit 18")];
  idx.bus_station = [north(1.2, "Bus Depot")];
  idx.airport = [north(20, "RGIA")];
  idx.mall = [north(2, "Inorbit Mall")];
  idx.college = [north(2, "JNTU")];
  idx.school = [north(0.7, "Public School"), north(2.2, "High School")];
  idx.park = [north(0.4, "KBR Park"), north(1.1, "Lake Park"), north(2.4, "Botanical Garden")];
  idx.job_hub = [north(3, "HITEC City", { areaHa: 300 })];
  return idx;
}

describe("accessibility score", () => {
  test("closeness falls off linearly between full and zero distance", () => {
    assert.equal(closeness(1, 2, 12), 1);
    assert.equal(closeness(7, 2, 12), 0.5);
    assert.equal(closeness(20, 2, 12), 0);
    assert.equal(closeness(undefined, 2, 12), 0);
  });

  test("a well-served apartment scores high, with named places in the notes", () => {
    const r = computeAccessibility({ lat: LAT, lng: LNG, propertyType: "Apartment" }, wellServed());
    assert.ok(r.score >= 85, `score ${r.score}`);
    assert.equal(r.confidence, "HIGH");
    assert.deepEqual(r.components.map((c) => c.max), [35, 30, 20, 15]);
    assert.match(r.components[0].note, /ORR Exit 18 1\.5 km · Raidurg 800 m/);
    assert.equal(r.nearest.hospital?.name, "Care Hospital");
    assert.equal(r.within["2"].hospital, 2);
    assert.equal(r.within["5"].hospital, 4);
    assert.deepEqual(r.watchOuts, []);
  });

  test("land weights connectivity and jobs above daily needs", () => {
    const r = computeAccessibility({ lat: LAT, lng: LNG, propertyType: "Plots" }, wellServed());
    assert.deepEqual(r.components.map((c) => c.max), [40, 15, 30, 15]);
  });

  test("a sparsely mapped location scores neutral on daily needs and green space, not low", () => {
    const idx = empty();
    idx.orr_exit = [north(10, "ORR Exit 15")];
    idx.airport = [north(40, "RGIA")];
    const r = computeAccessibility({ lat: LAT, lng: LNG, propertyType: "Apartment" }, idx);
    assert.equal(r.confidence, "LOW");
    const daily = r.components.find((c) => c.key === "daily")!;
    const green = r.components.find((c) => c.key === "green")!;
    assert.equal(daily.points, 15); // half of 30
    assert.equal(green.points, 8); // half of 15, rounded
    assert.match(daily.note, /neutral/);
  });

  test("a missing school never costs points; a nearby one adds them", () => {
    const withFar = wellServed(); withFar.school = [north(9, "Far School")];
    const none = wellServed(); none.school = [];
    const near = wellServed();
    const daily = (idx: PlaceIndex) => computeAccessibility({ lat: LAT, lng: LNG, propertyType: "Apartment" }, idx).components[1].points;
    assert.equal(daily(none), daily(withFar));
    assert.ok(daily(near) > daily(none));
  });

  test("a power line 40 m away is a warning for an exact pin, not an approximate one", () => {
    const idx = wellServed();
    const offset = 0.04 / 111.32 / Math.cos((LAT * Math.PI) / 180); // 40 m east
    idx.power_line = [{ id: "line", name: null, rings: [[[LNG + offset, LAT - 0.01], [LNG + offset, LAT + 0.01]]] }];
    const exact = computeAccessibility({ lat: LAT, lng: LNG, propertyType: "Plots" }, idx);
    assert.match(exact.watchOuts.map((w) => w.label).join(), /power line about 40 m/);
    const approx = computeAccessibility({ lat: LAT, lng: LNG, propertyType: "Plots", coordPrecision: "approximate" }, idx);
    assert.deepEqual(approx.watchOuts, []);
    assert.equal(approx.confidence, "MEDIUM"); // an approximate pin is never HIGH
    // Warnings never change the score.
    assert.equal(exact.score, computeAccessibility({ lat: LAT, lng: LNG, propertyType: "Plots" }, wellServed()).score);
  });

  test("a power line that loops around a pin, 2 km away on every side, is not a warning", () => {
    const idx = wellServed();
    const d = 0.018; // ~2 km
    idx.power_line = [{ id: "loop", name: null, rings: [[[LNG - d, LAT - d], [LNG + d, LAT - d], [LNG + d, LAT + d], [LNG - d, LAT + d], [LNG - d, LAT - d]]] }];
    assert.deepEqual(computeAccessibility({ lat: LAT, lng: LNG, propertyType: "Apartment" }, idx).watchOuts, []);
  });

  test("a landfill within 3 km is flagged by name", () => {
    const idx = wellServed();
    idx.landfill = [north(2.5, "Jawaharnagar dump yard")];
    const r = computeAccessibility({ lat: LAT, lng: LNG, propertyType: "Apartment" }, idx);
    assert.deepEqual(r.watchOuts.map((w) => w.key), ["landfill"]);
    assert.match(r.watchOuts[0].label, /Landfill 2\.5 km away \(Jawaharnagar dump yard\)/);
  });

  test("a small named industrial estate is a job hub but not a major one; a named IT park is", () => {
    const base = wellServed();
    base.job_hub = [north(1, "Mini Industrial Estate", { areaHa: 25 })];
    const small = computeAccessibility({ lat: LAT, lng: LNG, propertyType: "Apartment" }, base).components[2];
    base.job_hub = [north(1, "Kalyani Tech Park", { areaHa: 3 })];
    const park = computeAccessibility({ lat: LAT, lng: LNG, propertyType: "Apartment" }, base).components[2];
    assert.ok(small.points < park.points, `${small.points} vs ${park.points}`);
    assert.equal(park.points, 20);
  });
});

describe("osm geometry", () => {
  const square: Ring = (() => {
    const dLat = 1 / 110.574, dLng = 1 / (111.32 * Math.cos((LAT * Math.PI) / 180));
    return [[LNG, LAT], [LNG + dLng, LAT], [LNG + dLng, LAT + dLat], [LNG, LAT + dLat], [LNG, LAT]];
  })();

  test("a 1 km square is about 100 ha", () => {
    assert.ok(Math.abs(ringAreaHa(square) - 100) < 1, String(ringAreaHa(square)));
  });

  test("distance to an edge and point-in-polygon", () => {
    assert.ok(Math.abs(distanceToRingKm(square, LAT + 0.5 / 110.574, LNG - 0.5 / 106.3) - 0.5) < 0.02);
    assert.equal(insideRing(square, LAT + 0.0045, LNG + 0.0047), true);
    assert.equal(insideRing(square, LAT - 0.01, LNG), false);
  });

  test("a 2 km circle ring stays 2 km from its centre", () => {
    const ring = circleRing(LAT, LNG, 2, 32);
    for (const [x, y] of ring) assert.ok(Math.abs(haversineKm(LAT, LNG, y, x) - 2) < 0.02);
    assert.deepEqual(ring[0], ring[ring.length - 1]);
  });

});
