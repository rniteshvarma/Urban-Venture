import { test } from "node:test";
import assert from "node:assert/strict";
import { publicProof } from "./proof";

test("nothing set means nothing shown", () => {
  assert.deepEqual(publicProof({}), { reraAgentNumber: null, google: null });
});

test("rating needs a review count, and a valid range", () => {
  assert.equal(publicProof({ NEXT_PUBLIC_GOOGLE_RATING: "4.8" }).google, null);
  assert.equal(publicProof({ NEXT_PUBLIC_GOOGLE_RATING: "7", NEXT_PUBLIC_GOOGLE_REVIEW_COUNT: "40" }).google, null);
  assert.deepEqual(publicProof({ NEXT_PUBLIC_GOOGLE_RATING: "4.86", NEXT_PUBLIC_GOOGLE_REVIEW_COUNT: "120", NEXT_PUBLIC_GOOGLE_REVIEWS_URL: "https://g.page/r/x" }).google,
    { rating: 4.9, reviews: 120, url: "https://g.page/r/x" });
});

test("RERA number is trimmed; a non-https review link is dropped", () => {
  const p = publicProof({ NEXT_PUBLIC_RERA_AGENT_NUMBER: " A02500001234 ", NEXT_PUBLIC_GOOGLE_RATING: "4.5", NEXT_PUBLIC_GOOGLE_REVIEW_COUNT: "10", NEXT_PUBLIC_GOOGLE_REVIEWS_URL: "javascript:alert(1)" });
  assert.equal(p.reraAgentNumber, "A02500001234");
  assert.equal(p.google!.url, null);
});
