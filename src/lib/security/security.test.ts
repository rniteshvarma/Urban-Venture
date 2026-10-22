import { describe, test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { safeEqual } from "./compare";
import { verifyPubSubPush } from "./pubsub-auth";
import { PUBLIC_TOKEN, webhookToken } from "./tokens";

const ENV = { ...process.env };
afterEach(() => {
  process.env = { ...ENV };
});
const req = (url: string, headers: Record<string, string> = {}) => new Request(url, { method: "POST", headers });

describe("Gmail push authentication", () => {
  test("fails closed in production when nothing is configured", async () => {
    Object.assign(process.env, { NODE_ENV: "production" });
    delete process.env.GMAIL_PUSH_TOKEN;
    delete process.env.GMAIL_PUSH_AUDIENCE;
    assert.deepEqual(await verifyPubSubPush(req("https://x/api/webhooks/gmail")), { ok: false, status: 503, reason: "Gmail push authentication not configured" });
  });
  test("shared token must match exactly", async () => {
    process.env.GMAIL_PUSH_TOKEN = "s3cret-value";
    assert.equal((await verifyPubSubPush(req("https://x/api/webhooks/gmail?token=s3cret-value"))).ok, true);
    assert.equal((await verifyPubSubPush(req("https://x/api/webhooks/gmail?token=s3cret-valuX"))).ok, false);
    assert.equal((await verifyPubSubPush(req("https://x/api/webhooks/gmail"))).ok, false);
  });
  test("a forged bearer token is rejected", async () => {
    process.env.GMAIL_PUSH_AUDIENCE = "https://example.com/api/webhooks/gmail";
    delete process.env.GMAIL_PUSH_TOKEN;
    const r = await verifyPubSubPush(req("https://x/api/webhooks/gmail", { authorization: "Bearer eyJhbGciOiJub25lIn0.eyJhdWQiOiJ4In0." }));
    assert.equal(r.ok, false);
  });
});

describe("tokens and comparison", () => {
  test("constant-time compare", () => {
    assert.equal(safeEqual("abc", "abc"), true);
    assert.equal(safeEqual("abc", "abd"), false);
    assert.equal(safeEqual("abc", "abcd"), false);
    assert.equal(safeEqual(null, "abc"), false);
  });
  test("new webhook tokens are long and random; old seed tokens are recognised as public", () => {
    const a = webhookToken("99acres"), b = webhookToken("99acres");
    assert.notEqual(a, b);
    assert.match(a, /^99acres-[0-9a-f]{32}$/);
    assert.ok(PUBLIC_TOKEN.test("gmail-token-uv-2026"));
    assert.ok(!PUBLIC_TOKEN.test(a));
  });
});

import { canView, isPubliclyVisible, withoutPrivateFields } from "../projects/visibility";
import { projectWhere } from "../projects/query";
describe("project visibility", () => {
  const live = { status: "ACTIVE", reviewState: "PUBLISHED", listingStatus: "APPROVED", ownerId: "u1" };
  test("only approved, published, non-archived listings are public", () => {
    assert.equal(isPubliclyVisible(live), true);
    assert.equal(isPubliclyVisible({ ...live, status: "SOLD_OUT" }), true);
    assert.equal(isPubliclyVisible({ ...live, listingStatus: "PENDING_REVIEW" }), false);
    assert.equal(isPubliclyVisible({ ...live, reviewState: "DRAFT" }), false);
    assert.equal(isPubliclyVisible({ ...live, status: "ARCHIVED" }), false);
  });
  test("owners and admins see their unpublished listings; nobody else does", () => {
    const pending = { ...live, listingStatus: "PENDING_REVIEW" };
    assert.equal(canView(pending, { userId: "u1", isAdmin: false }), true);
    assert.equal(canView(pending, { userId: "u2", isAdmin: false }), false);
    assert.equal(canView(pending, { userId: null, isAdmin: false }), false);
    assert.equal(canView(pending, { userId: null, isAdmin: true }), true);
  });
  test("internal fields are stripped", () => {
    const p = withoutPrivateFields({ name: "X", reviewNote: "internal", ownerId: "u1", surveyNumbers: ["12"], rejectReason: "r" });
    assert.deepEqual(Object.keys(p), ["name"]);
  });
  test("the public feed can't be widened with ?status=", () => {
    const w = projectWhere({ status: "ALL" });
    assert.equal(w.status, "ACTIVE");
    assert.ok(JSON.stringify(w.AND).includes('"listingStatus":"APPROVED"'));
    assert.equal(projectWhere({ status: "ALL" }, { admin: true }).status, undefined);
  });
});
