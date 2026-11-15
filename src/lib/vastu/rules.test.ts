import { test } from "node:test";
import assert from "node:assert/strict";
import { cellZone, sideDirections, vastuReport } from "./rules";

test("textbook plan follows the guidelines", () => {
  const r = vastuReport("E", [
    { type: "kitchen", zone: "SE" },
    { type: "master_bedroom", zone: "SW" },
    { type: "pooja", zone: "NE" },
    { type: "toilet", zone: "NW" },
  ]);
  assert.equal(r.attention, 0);
  assert.equal(r.follows, 5);
  assert.match(r.summary, /well-oriented/);
});

test("common problem placements are flagged, never called bad", () => {
  const r = vastuReport("SW", [
    { type: "toilet", zone: "NE" },
    { type: "kitchen", zone: "C" },
  ]);
  assert.equal(r.attention, 3);
  for (const f of [r.entrance!, ...r.findings]) assert.doesNotMatch(f.text, /\bbad\b|\bunlucky\b|\bdanger/i);
  assert.match(r.findings[1].text, /centre/);
});

test("repeated room types are numbered", () => {
  const r = vastuReport(null, [{ type: "bedroom", zone: "W" }, { type: "bedroom", zone: "S" }]);
  assert.deepEqual(r.findings.map((f) => f.label), ["Bedroom", "Bedroom 2"]);
});

test("empty plan asks for input", () => {
  assert.match(vastuReport(null, []).summary, /Mark the main door/);
});

test("drawing sides map to compass directions for any north", () => {
  assert.deepEqual(sideDirections("top"), { top: "N", right: "E", bottom: "S", left: "W" });
  assert.deepEqual(sideDirections("right"), { top: "W", right: "N", bottom: "E", left: "S" });
  assert.deepEqual(sideDirections("bottom"), { top: "S", right: "W", bottom: "N", left: "E" });
});

test("cells map to zones, rotated with the drawing", () => {
  assert.equal(cellZone(0, 2, "top"), "NE");
  assert.equal(cellZone(2, 0, "top"), "SW");
  assert.equal(cellZone(1, 1, "top"), "C");
  assert.equal(cellZone(0, 1, "top"), "N");
  // North on the right: the top-right cell is North-West.
  assert.equal(cellZone(0, 2, "right"), "NW");
  assert.equal(cellZone(2, 2, "right"), "NE");
});

test("door only: asks for rooms instead of calling the plan well-oriented", () => {
  const r = vastuReport("NE", []);
  assert.doesNotMatch(r.summary, /well-oriented/);
  assert.match(r.summary, /mark where each room sits/);
});
