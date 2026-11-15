import { test } from "node:test";
import assert from "node:assert/strict";
import { parseGoogleRating } from "./google";

test("accepts a real Google profile link with rating and review count", () => {
  const r = parseGoogleRating({ rating: "4.36", reviews: "1200", url: "https://maps.app.goo.gl/abc123" });
  assert.deepEqual(r, { ok: true, value: { rating: 4.4, reviews: 1200, url: "https://maps.app.goo.gl/abc123" } });
});

test("all fields empty clears the rating", () => {
  assert.deepEqual(parseGoogleRating({ rating: "", reviews: "", url: "" }), { ok: true, value: null });
});

test("rejects out-of-range ratings, missing reviews and non-Google links", () => {
  assert.equal(parseGoogleRating({ rating: 6, reviews: 10, url: "https://maps.app.goo.gl/x" }).ok, false);
  assert.equal(parseGoogleRating({ rating: 4, reviews: 0, url: "https://maps.app.goo.gl/x" }).ok, false);
  assert.equal(parseGoogleRating({ rating: 4, reviews: 10, url: "https://example.com/reviews" }).ok, false);
  assert.equal(parseGoogleRating({ rating: 4, reviews: 10, url: "http://maps.app.goo.gl/x" }).ok, false);
  assert.equal(parseGoogleRating({ rating: 4, reviews: 10, url: "https://www.google.com/maps/place/X" }).ok, true);
});
