import { test } from "node:test";
import assert from "node:assert/strict";
import { zoneFor, withinHyderabad } from "./zones";

test("locality keywords match whole words only", () => {
  assert.equal(zoneFor("Ameerpet"), "Central Hyderabad");
  assert.equal(zoneFor("Meerpet"), "LB Nagar / Hayathnagar / Nagole");
  assert.equal(zoneFor("Kokapet"), "Financial District / Kokapet / Narsingi");
});

test("unknown locality falls back to the nearest zone anchor", () => {
  assert.equal(zoneFor("Some New Layout", 17.445, 78.372), "Gachibowli / HITEC City / Kondapur");
  assert.equal(zoneFor("Some New Layout"), null);
});

test("Hyderabad radius", () => {
  assert.equal(withinHyderabad(17.07, 78.2), true);   // Shadnagar
  assert.equal(withinHyderabad(17.69, 83.22), false); // Visakhapatnam
});
