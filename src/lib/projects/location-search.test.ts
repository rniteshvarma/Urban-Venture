import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { rankLocations, type LocationSuggestion } from "./location-search";

const FD = "Financial District / Kokapet / Narsingi";
const GB = "Gachibowli / HITEC City / Kondapur";
const ALL: LocationSuggestion[] = [
  { name: "Kokapet", area: FD, count: 45 },
  { name: "Kondapur", area: GB, count: 30 },
  { name: "Narsingi", area: FD, count: 20 },
  { name: "Kollur", area: "Tellapur / Nallagandla / Kollur", count: 28 },
  { name: "Tellapur", area: "Tellapur / Nallagandla / Kollur", count: 45 },
  { name: FD, area: null, count: 118 },
  { name: GB, area: null, count: 64 },
];

describe("location suggestions", () => {
  test("nothing typed: most-listed localities, not areas", () => {
    assert.deepEqual(rankLocations(ALL, "", 3).map((s) => s.name), ["Kokapet", "Tellapur", "Kondapur"]);
  });

  test("typing narrows by prefix, busiest first", () => {
    assert.deepEqual(rankLocations(ALL, "ko").map((s) => s.name), ["Kokapet", "Kondapur", "Kollur", FD, GB]);
    assert.deepEqual(rankLocations(ALL, " TELL ").map((s) => s.name)[0], "Tellapur");
  });

  test("an area name finds the area and the localities inside it", () => {
    const names = rankLocations(ALL, "hitec").map((s) => s.name);
    assert.equal(names[0], GB); // a word in the area name starts with it
    assert.ok(names.includes("Kondapur"));
  });

  test("no match returns nothing", () => {
    assert.deepEqual(rankLocations(ALL, "zzz"), []);
  });
});
