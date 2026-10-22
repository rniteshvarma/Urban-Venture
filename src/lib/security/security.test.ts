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
