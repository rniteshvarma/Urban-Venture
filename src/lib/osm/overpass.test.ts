import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { buildQuery, normalise, type OverpassElement } from "./overpass";

// A square ~`km` on a side starting at (lat, lng), as Overpass `out geom` returns it.
const square = (lat: number, lng: number, km: number) => {
  const dLat = km / 110.574, dLng = km / (111.32 * Math.cos((lat * Math.PI) / 180));
  return [{ lat, lon: lng }, { lat, lon: lng + dLng }, { lat: lat + dLat, lon: lng + dLng }, { lat: lat + dLat, lon: lng }, { lat, lon: lng }];
};

describe("overpass import", () => {
  test("queries use the import area and the right output mode", () => {
    const q = buildQuery("hospital");
    assert.match(q, /nwr\["amenity"="hospital"\]\(16\.8,77\.75,18,79\.1\);/);
    assert.match(q, /out center tags;$/);
    assert.match(buildQuery("power_line"), /out geom tags;$/);
  });

  test("stations are split into metro and rail, and duplicates dropped", () => {
    const els: OverpassElement[] = [
      { type: "node", id: 1, lat: 17.44, lon: 78.38, tags: { railway: "station", station: "subway", name: "Raidurg" } },
      { type: "node", id: 2, lat: 17.43, lon: 78.5, tags: { railway: "station", name: "Secunderabad Junction" } },
      { type: "node", id: 3, lat: 17.4, lon: 78.47, tags: { railway: "station", name: "MGBS", network: "Hyderabad Metro" } },
      { type: "node", id: 1, lat: 17.44, lon: 78.38, tags: { railway: "station", station: "subway", name: "Raidurg" } },
    ];
    const out = normalise("transit", els);
    assert.deepEqual(out.map((p) => [p.name, p.subcategory]), [["Raidurg", "metro"], ["Secunderabad Junction", "rail"], ["MGBS", "metro"]]);
  });

  test("job hubs keep big areas and named parks, and drop small unnamed patches", () => {
    const els: OverpassElement[] = [
      { type: "way", id: 10, geometry: square(17.4, 78.3, 1), tags: { landuse: "commercial" } }, // ~100 ha
      { type: "way", id: 11, geometry: square(17.5, 78.3, 0.2), tags: { landuse: "industrial" } }, // ~4 ha, unnamed
      { type: "way", id: 12, geometry: square(17.6, 78.3, 0.2), tags: { landuse: "industrial", name: "Genome Valley SEZ" } }, // small but named
      { type: "way", id: 13, geometry: square(17.4, 78.4, 0.2), tags: { highway: "service", name: "Wipro SEZ Parking Route" } }, // a road
      { type: "way", id: 14, geometry: square(17.4, 78.5, 0.2), tags: { name: "Phoenix SEZ Internal road" } },
    ];
    const out = normalise("job_hub", els);
    assert.deepEqual(out.map((p) => p.id), ["way/10", "way/12"]);
    assert.ok(Math.abs((out[0].areaHa ?? 0) - 100) < 2);
    assert.equal(out[0].geometry, null); // areas keep only their centre and size
  });

  test("power lines keep their (thinned) shape for edge distances", () => {
    const pts = Array.from({ length: 50 }, (_, i) => ({ lat: 17.4 + i * 0.00005, lon: 78.4 })); // a vertex every ~5.5 m
    const out = normalise("power_line", [{ type: "way", id: 7, geometry: pts, tags: { power: "line" } }]);
    assert.equal(out.length, 1);
    const ring = out[0].geometry![0];
    assert.ok(ring.length < 20 && ring.length >= 2, String(ring.length));
    assert.deepEqual(ring[0], [78.4, 17.4]);
  });
});
