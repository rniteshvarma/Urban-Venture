import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { freshnessOf } from "./freshness";
import { isPriceMove, readSourcePage } from "./recheck";
import { priceBadge } from "../projects/price-change";

const NOW = new Date("2026-10-23T06:00:00Z");
const LAND_SRC = [{ name: "1acre.in", url: "https://1acre.in/lands-for-sale/x-1", accessed: "2026-10-22" }];
const PROJ_SRC = [
  { name: "RoofandFloor", url: "https://www.roofandfloor.com/hyderabad/project/a/1", accessed: "2026-07-01" },
  { name: "TG-RERA", url: "https://rerait.telangana.gov.in/PrintPreview/PrintPreview?q=x", accessed: "2026-07-01" },
];

describe("listing freshness", () => {
  test("uses the collection date until the first re-check", () => {
    const f = freshnessOf({ listingKind: "LAND_LISTING", sources: LAND_SRC }, NOW);
    assert.equal(f.state, "fresh");
    assert.equal(f.checkedOn, "2026-10-22");
    assert.equal(f.sourceName, "1acre.in");
    assert.equal(f.label, "Last checked yesterday");
  });
  test("a later re-check wins over the collection date", () => {
    const f = freshnessOf({ listingKind: "PROJECT", sources: PROJ_SRC, sourceCheckedAt: "2026-10-23T01:00:00Z", sourceState: "LIVE" }, NOW);
    assert.equal(f.checkedOn, "2026-10-23");
    assert.equal(f.label, "Last checked today");
    assert.equal(f.sourceName, "roofandfloor.com", "the RERA link is not the listing source");
  });
  test("land goes stale after 30 days, projects after 90", () => {
    const land = freshnessOf({ listingKind: "LAND_LISTING", sources: [{ ...LAND_SRC[0], accessed: "2026-09-01" }] }, NOW);
    assert.equal(land.state, "aging");
    assert.equal(land.label, "Not re-checked since 1 Sept 2026".replace("Sept", new Date("2026-09-01").toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" })));
    const proj = freshnessOf({ listingKind: "PROJECT", sources: PROJ_SRC }, NOW);
    assert.equal(proj.state, "aging", "114 days old");
    const recent = freshnessOf({ listingKind: "PROJECT", sources: [{ ...PROJ_SRC[0], accessed: "2026-09-01" }] }, NOW);
    assert.equal(recent.state, "fresh", "52 days is fine for a RERA project");
  });
  test("gone from the source: land 'may be sold', projects 'removed'", () => {
    const land = freshnessOf({ listingKind: "LAND_LISTING", sources: LAND_SRC, sourceState: "GONE", sourceGoneSince: "2026-10-20T00:00:00Z" }, NOW);
    assert.equal(land.state, "gone");
    assert.match(land.label, /^May be sold — gone from 1acre\.in on 20 Oct 2026$/);
    const proj = freshnessOf({ listingKind: "PROJECT", sources: PROJ_SRC, sourceState: "GONE" }, NOW);
    assert.match(proj.label, /^Listing removed from roofandfloor\.com/);
  });
  test("no dates at all is honest about it", () => {
    assert.equal(freshnessOf({ sources: [] }, NOW).label, "Check date unknown");
  });
});

/** A 1acre page as it streams its listing. */
const oneAcre = (slug: string, over: Record<string, unknown> = {}) => {
  const rows = { "3d": { id: 1, slug, total_price: 120, price_per_acre: 60, status: "active", land_size: null, total_land_size: 2, ...over } };
  const text = Object.entries(rows).map(([k, v]) => `${k}:${JSON.stringify(v)}`).join("\n");
  return `<script>self.__next_f.push([1,${JSON.stringify(text)}])</script>`;
};

describe("re-reading a source page", () => {
  const U = "https://1acre.in/lands-for-sale/2-acre-land-in-x-telangana-55";
  test("404 / 410 mean gone; 5xx and blocks are unknown, never gone", () => {
    assert.equal(readSourcePage(U, 410, "").state, "GONE");
    assert.equal(readSourcePage("https://www.roofandfloor.com/hyderabad/project/a/1", 404, "").state, "GONE");
    assert.equal(readSourcePage(U, 503, "").state, "UNKNOWN");
    assert.equal(readSourcePage(U, 403, "").state, "UNKNOWN");
  });
  test("1acre: active listing is live with its current price; sold is gone", () => {
    const live = readSourcePage(U, 200, oneAcre("2-acre-land-in-x-telangana-55"));
    assert.deepEqual(live, { state: "LIVE", priceLakh: { min: 120, max: 120 } });
    assert.equal(readSourcePage(U, 200, oneAcre("2-acre-land-in-x-telangana-55", { status: "sold" })).state, "GONE");
    assert.equal(readSourcePage(U, 200, "<html>maintenance</html>").state, "UNKNOWN");
  });
  test("Housiey answers 200 with a stub page for removed projects", () => {
    const url = "https://housiey.com/projects/some-project";
    assert.equal(readSourcePage(url, 200, "<title>some-project - Housiey</title>").state, "GONE");
    assert.equal(readSourcePage(url, 200, "<title>Some Project Tellapur - Brochure, Price Sheet</title>").state, "LIVE");
  });
  test("price moves under 1% (or ₹0.5 L) are noise", () => {
    assert.equal(isPriceMove({ min: 100, max: 100 }, { min: 100.4, max: 100.4 }), false);
    assert.equal(isPriceMove({ min: 100, max: 100 }, { min: 96, max: 96 }), true);
  });
});

describe("price badge", () => {
  test("a drop within 60 days shows; older ones don't", () => {
    const b = priceBadge({ fromMinLakh: 120, toMinLakh: 116, changedAt: "2026-10-03T08:00:00Z" }, NOW);
    assert.equal(b?.direction, "down");
    assert.equal(b?.label, "₹4 L lower since 3 Oct");
    assert.equal(priceBadge({ fromMinLakh: 120, toMinLakh: 116, changedAt: "2026-07-01T00:00:00Z" }, NOW), null);
    assert.equal(priceBadge({ fromMinLakh: 50, toMinLakh: 55, changedAt: "2026-10-20T00:00:00Z" }, NOW)?.direction, "up");
  });
});
