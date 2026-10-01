/**
 * WhatsApp provider layer — integration tests against the dev database.
 *
 *   npm run test:whatsapp
 *
 * The provider API is stubbed (global fetch), so nothing is sent. Every row
 * created uses the +91999000xxxx range and zz_test_ template names and is
 * removed afterwards. Never run against production.
 */
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import prisma from "../../src/lib/prisma";
import { resetProviderCache } from "../../src/lib/whatsapp";
import { sendTemplateMessage, sendTextMessage } from "../../src/lib/whatsapp/send";
import { drainWebhookProcessing, handleWhatsAppWebhook } from "../../src/lib/whatsapp/webhook";

const PHONE = (n: number) => `+91999000${String(n).padStart(4, "0")}`;
const T = { utility: "zz_test_utility_v1", marketing: "zz_test_marketing_v1" };
const realFetch = globalThis.fetch;
let apiCalls = 0;
let leadId = "";

async function cleanup() {
  const logs = await prisma.whatsAppLog.findMany({ where: { toPhone: { startsWith: "+91999000" } }, select: { id: true } });
  await prisma.whatsAppIdempotencyKey.deleteMany({ where: { logId: { in: logs.map((l) => l.id) } } });
  await prisma.whatsAppLog.deleteMany({ where: { id: { in: logs.map((l) => l.id) } } });
  await prisma.whatsAppSuppression.deleteMany({ where: { phone: { startsWith: "+91999000" } } });
  await prisma.whatsAppWebhookEvent.deleteMany({ where: { OR: [{ fromPhone: { startsWith: "+91999000" } }, { providerMessageId: { startsWith: "wamid.zz" } }] } });
  await prisma.whatsAppTemplateRegistry.deleteMany({ where: { name: { startsWith: "zz_test_" } } });
  await prisma.lead.deleteMany({ where: { phone: { startsWith: "+91999000" } } });
}

before(async () => {
  process.env.WHATSAPP_PROVIDER = "meta-cloud";
  process.env.META_WABA_ID = "111";
  process.env.META_PHONE_NUMBER_ID = "222";
  process.env.META_SYSTEM_USER_TOKEN = "token";
  process.env.META_APP_SECRET = "app-secret";
  resetProviderCache();
  await cleanup();

  await prisma.whatsAppTemplateRegistry.createMany({
    data: [
      { name: T.utility, language: "en", category: "UTILITY", status: "APPROVED", bodyParamCount: 1, lastSyncedAt: new Date(), syncedFrom: "test" },
      { name: T.marketing, language: "en", category: "MARKETING", status: "APPROVED", bodyParamCount: 2, lastSyncedAt: new Date(), syncedFrom: "test" },
    ],
  });
  const lead = await prisma.lead.create({
    data: { name: "ZZ Test Lead", email: "zz-test-lead@example.com", phone: PHONE(50), budget: 50, horizon: 3, city: "Hyderabad" },
  });
  leadId = lead.id;
});

after(async () => {
  globalThis.fetch = realFetch;
  await cleanup();
  await prisma.$disconnect();
});

/** Stub the provider API with a queue of responses (the last repeats); default = success. */
function freshStub(...r: Array<{ status?: number; body: unknown }>) {
  let n = 0;
  apiCalls = 0;
  globalThis.fetch = (async (url: string | URL) => {
    // Only message sends count; the post-send tier check also reads account info.
    if (!String(url).endsWith("/messages")) return new Response(JSON.stringify({}), { status: 200 });
    apiCalls++;
    const resp = r.length ? r[Math.min(n++, r.length - 1)] : { body: { messages: [{ id: `wamid.zz${Date.now()}${apiCalls}` }] } };
    return new Response(JSON.stringify(resp.body), { status: resp.status ?? 200 });
  }) as typeof fetch;
}

describe("idempotency", () => {
  test("a retried send with the same key does not double-send", async () => {
    freshStub({ body: { messages: [{ id: "wamid.zzIDEM" }] } });
    const send = () =>
      sendTemplateMessage({ to: PHONE(1), templateName: T.utility, bodyParams: ["Asha"], category: "UTILITY", feature: "test", contextId: "enquiry:abc" });
    const first = await send();
    const second = await send();
    assert.equal(first.ok, true);
    assert.equal(first.status, "ACCEPTED");
    assert.equal(second.status, "DUPLICATE");
    assert.equal(second.logId, first.logId);
    assert.equal(apiCalls, 1, "provider called once");
    assert.equal(await prisma.whatsAppLog.count({ where: { toPhone: PHONE(1) } }), 1);
  });

  test("a retryable failure is retried on the same log row", async () => {
    freshStub({ status: 503, body: { error: { message: "down", code: 131016 } } });
    const send = () => sendTextMessage({ to: PHONE(2), text: "hello", feature: "test", contextId: "retry:1" });
    const failed = await send();
    assert.equal(failed.ok, false);
    assert.equal(failed.errorCode, "PROVIDER_UNAVAILABLE");
    assert.equal(apiCalls, 3, "adapter backed off and retried");

    freshStub({ body: { messages: [{ id: "wamid.zzRETRY" }] } });
    const retried = await send();
    assert.equal(retried.ok, true);
    assert.equal(retried.logId, failed.logId);
    const log = await prisma.whatsAppLog.findUniqueOrThrow({ where: { id: failed.logId! } });
    assert.equal(log.status, "SENT");
    assert.equal(log.attemptCount, 4);
    assert.equal(log.providerMessageId, "wamid.zzRETRY");
  });
});

describe("pre-send validation", () => {
  test("wrong parameter count is caught before the API call", async () => {
    freshStub();
    const r = await sendTemplateMessage({ to: PHONE(3), templateName: T.marketing, bodyParams: ["only one"], category: "MARKETING", feature: "test", contextId: "mismatch" });
    assert.equal(r.ok, false);
    assert.equal(r.errorCode, "TEMPLATE_PARAM_MISMATCH");
    assert.equal(apiCalls, 0);
    const log = await prisma.whatsAppLog.findUniqueOrThrow({ where: { id: r.logId! } });
    assert.equal(log.normalisedError, "TEMPLATE_PARAM_MISMATCH");
  });

  test("unknown template is caught before the API call", async () => {
    freshStub();
    const r = await sendTemplateMessage({ to: PHONE(4), templateName: "zz_test_missing", bodyParams: [], category: "UTILITY", feature: "test", contextId: "missing" });
    assert.equal(r.errorCode, "TEMPLATE_NOT_FOUND");
    assert.equal(apiCalls, 0);
  });
});

describe("logging and cost", () => {
  test("every send is logged with provider, category and estimated cost", async () => {
    freshStub();
    const u = await sendTemplateMessage({ to: PHONE(5), templateName: T.utility, bodyParams: ["x"], category: "UTILITY", feature: "pipeline_trigger", contextId: "cost:u" });
    const m = await sendTemplateMessage({ to: PHONE(5), templateName: T.marketing, bodyParams: ["x", "y"], category: "MARKETING", feature: "broadcast", contextId: "cost:m" });
    const [ul, ml] = await Promise.all([u, m].map((o) => prisma.whatsAppLog.findUniqueOrThrow({ where: { id: o.logId! } })));
    assert.deepEqual([ul.provider, ul.category, ul.estimatedCostPaise, ul.feature, ul.dryRun], ["meta-cloud", "UTILITY", 13, "pipeline_trigger", false]);
    assert.deepEqual([ml.provider, ml.category, ml.estimatedCostPaise, ml.feature], ["meta-cloud", "MARKETING", 86, "broadcast"]);
    assert.ok(ul.idempotencyKey && ul.idempotencyKey.length === 64);
  });
});

describe("suppression", () => {
  test("INVALID_NUMBER suppresses the number; later sends never reach the provider", async () => {
    freshStub({ status: 400, body: { error: { message: "Message undeliverable", code: 131026 } } });
    const r = await sendTemplateMessage({ to: PHONE(6), templateName: T.utility, bodyParams: ["x"], category: "UTILITY", feature: "test", contextId: "bad:1" });
    assert.equal(r.errorCode, "INVALID_NUMBER");
    assert.ok(await prisma.whatsAppSuppression.findUnique({ where: { phone: PHONE(6) } }));

    freshStub();
    const again = await sendTemplateMessage({ to: PHONE(6), templateName: T.utility, bodyParams: ["x"], category: "UTILITY", feature: "test", contextId: "bad:2" });
    assert.equal(again.errorCode, "NOT_OPTED_IN");
    assert.equal(apiCalls, 0);
  });
});

describe("unified webhook", () => {
  const signed = (payload: unknown, secret = "app-secret") => {
    const raw = JSON.stringify(payload);
    const sig = createHmac("sha256", secret).update(raw).digest("hex");
    return new Request("http://localhost/api/webhooks/whatsapp", { method: "POST", body: raw, headers: { "x-hub-signature-256": `sha256=${sig}` } });
  };

  test("delivery receipt updates the log; redelivery is ignored; tampering is rejected", async () => {
    freshStub({ body: { messages: [{ id: "wamid.zzRECEIPT" }] } });
    const sent = await sendTemplateMessage({ to: PHONE(7), templateName: T.utility, bodyParams: ["x"], category: "UTILITY", feature: "test", contextId: "receipt" });
    const payload = {
      object: "whatsapp_business_account",
      entry: [{ changes: [{ field: "messages", value: { statuses: [{ id: "wamid.zzRECEIPT", status: "delivered", timestamp: String(Math.floor(Date.now() / 1000)), recipient_id: PHONE(7).slice(1) }] } }] }],
    };

    const res = await handleWhatsAppWebhook(signed(payload));
    assert.equal(res.status, 200);
    await drainWebhookProcessing();
    const log = await prisma.whatsAppLog.findUniqueOrThrow({ where: { id: sent.logId! } });
    assert.equal(log.status, "DELIVERED");
    assert.ok(log.deliveredAt);

    const before = await prisma.whatsAppWebhookEvent.count({ where: { providerMessageId: "wamid.zzRECEIPT" } });
    assert.equal((await handleWhatsAppWebhook(signed(payload))).status, 200);
    assert.equal(await prisma.whatsAppWebhookEvent.count({ where: { providerMessageId: "wamid.zzRECEIPT" } }), before, "redelivery stored once");

    const tampered = signed(payload);
    const raw = JSON.stringify({ ...payload, object: "evil" });
    const forged = new Request(tampered.url, { method: "POST", body: raw, headers: tampered.headers });
    assert.equal((await handleWhatsAppWebhook(forged)).status, 401);
  });

  test("a READ receipt followed by a late DELIVERED stays READ", async () => {
    freshStub({ body: { messages: [{ id: "wamid.zzORDER" }] } });
    const sent = await sendTemplateMessage({ to: PHONE(8), templateName: T.utility, bodyParams: ["x"], category: "UTILITY", feature: "test", contextId: "order" });
    const status = (s: string) => ({
      object: "whatsapp_business_account",
      entry: [{ changes: [{ field: "messages", value: { statuses: [{ id: "wamid.zzORDER", status: s, timestamp: "1727000000", recipient_id: PHONE(8).slice(1) }] } }] }],
    });
    await handleWhatsAppWebhook(signed(status("read")));
    await drainWebhookProcessing();
    await handleWhatsAppWebhook(signed(status("delivered")));
    await drainWebhookProcessing();
    assert.equal((await prisma.whatsAppLog.findUniqueOrThrow({ where: { id: sent.logId! } })).status, "READ");
  });

  test("inbound STOP suppresses the number and opts the lead out", async () => {
    freshStub();
    const payload = {
      object: "whatsapp_business_account",
      entry: [
        {
          changes: [
            {
              field: "messages",
              value: {
                contacts: [{ wa_id: PHONE(50).slice(1), profile: { name: "ZZ Test Lead" } }],
                messages: [{ from: PHONE(50).slice(1), id: "wamid.zzSTOP", timestamp: String(Math.floor(Date.now() / 1000)), type: "text", text: { body: "STOP" } }],
              },
            },
          ],
        },
      ],
    };
    assert.equal((await handleWhatsAppWebhook(signed(payload))).status, 200);
    await drainWebhookProcessing();
    const lead = await prisma.lead.findUniqueOrThrow({ where: { id: leadId } });
    assert.equal(lead.whatsappOptOut, true);
    const sup = await prisma.whatsAppSuppression.findUnique({ where: { phone: PHONE(50) } });
    assert.equal(sup?.reason, "STOP_KEYWORD");
    assert.equal(apiCalls, 1, "one confirmation reply was sent before suppressing");
  });
});
