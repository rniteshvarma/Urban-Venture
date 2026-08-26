import { test } from "node:test";
import assert from "node:assert/strict";
import { pointInsideBoundary } from "./geo-check";

// A unit square from (0,0) to (2,2) in [lng,lat]
const square = { type: "Polygon", coordinates: [[[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]]] };

test("point inside the polygon → true", () => {
  assert.equal(pointInsideBoundary(1, 1, square), true); // lat=1, lng=1
});

test("point outside the polygon → false", () => {
  assert.equal(pointInsideBoundary(3, 3, square), false);
});

test("no boundary data → null (check did not run)", () => {
  assert.equal(pointInsideBoundary(1, 1, null), null);
  assert.equal(pointInsideBoundary(1, 1, {}), null);
});

test("unwraps a GeoJSON Feature", () => {
  assert.equal(pointInsideBoundary(1, 1, { type: "Feature", geometry: square }), true);
});

test("MultiPolygon: inside any polygon → true", () => {
  const mp = { type: "MultiPolygon", coordinates: [[[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]], [[[5, 5], [6, 5], [6, 6], [5, 6], [5, 5]]]] };
  assert.equal(pointInsideBoundary(5.5, 5.5, mp), true);
  assert.equal(pointInsideBoundary(3, 3, mp), false);
});

test("respects holes (point in hole → false)", () => {
  const withHole = {
    type: "Polygon",
    coordinates: [
      [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]],
      [[4, 4], [6, 4], [6, 6], [4, 6], [4, 4]],
    ],
  };
  assert.equal(pointInsideBoundary(5, 5, withHole), false); // in hole
  assert.equal(pointInsideBoundary(1, 1, withHole), true); // in outer, not hole
});
