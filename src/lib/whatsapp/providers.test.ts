/**
 * Provider-layer unit tests — no database, no network (fetch is stubbed).
 * Adapters are reached only through the factory, as application code would.
 */
import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { getProviderByName, getWhatsAppProvider, isDryRun, resetProviderCache, type NormalisedInboundEvent } from "./index";
import { checkTemplateParams } from "./registry";
import { estimateCostPaise, ratesPaise } from "./cost";
import { isRetryable, shouldSuppress, codeFromMessage } from "./errors";
import { toE164 } from "./phone";

const ENV_KEYS = [
  "WHATSAPP_PROVIDER", "META_WABA_ID", "META_PHONE_NUMBER_ID", "META_SYSTEM_USER_TOKEN", "META_APP_SECRET", "META_WEBHOOK_VERIFY_TOKEN",
  "AISENSY_API_KEY", "AISENSY_WEBHOOK_SECRET", "INTERAKT_API_KEY", "INTERAKT_WEBHOOK_SECRET", "WATI_API_URL", "WATI_API_ENDPOINT",
  "WATI_API_TOKEN", "WATI_WEBHOOK_SECRET", "WA_RATE_MARKETING_PAISE", "WA_RATE_SERVICE_PAISE", "WA_SERVICE_FREE_TIER",
];
const savedEnv: Record<string, string | undefined> = {};
const realFetch = globalThis.fetch;

type Call = { url: string; init: RequestInit; body: Record<string, unknown> | null };
let calls: Call[] = [];

/** Stub fetch with a queue of responses (last one repeats). */
function stubFetch(...responses: Array<{ status?: number; body: unknown }>) {
  calls = [];
  let i = 0;
  globalThis.fetch = (async (url: string | URL, init: RequestInit = {}) => {
    let body: Record<string, unknown> | null = null;
    try {
      body = typeof init.body === "string" ? JSON.parse(init.body) : null;
    } catch {
      body = null;
    }
    calls.push({ url: String(url), init, body });
    const r = responses[Math.min(i++, responses.length - 1)];
    return new Response(JSON.stringify(r.body), { status: r.status ?? 200, headers: { "Content-Type": "application/json" } });
  }) as typeof fetch;
}

beforeEach(() => {
  for (const k of ENV_KEYS) {
    savedEnv[k] = process.env[k];
    delete process.env[k];
  }
  resetProviderCache();
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (savedEnv[k] === undefined) delete process.env[k];
    else process.env[k] = savedEnv[k];
  }
  globalThis.fetch = realFetch;
  resetProviderCache();
});

function configureMeta() {
  process.env.META_WABA_ID = "111";
  process.env.META_PHONE_NUMBER_ID = "222";
  process.env.META_SYSTEM_USER_TOKEN = "token";
  process.env.META_APP_SECRET = "app-secret";
  process.env.META_WEBHOOK_VERIFY_TOKEN = "verify-me";
  resetProviderCache();
}

const sign = (secret: string, body: string) => createHmac("sha256", secret).update(body).digest("hex");

describe("factory", () => {
  test("defaults to meta-cloud and switches on WHATSAPP_PROVIDER alone", () => {
    assert.equal(getWhatsAppProvider().name, "meta-cloud");
    for (const name of ["aisensy", "interakt", "wati", "meta-cloud"] as const) {
      process.env.WHATSAPP_PROVIDER = name;
      resetProviderCache();
      assert.equal(getWhatsAppProvider().name, name);
    }
  });

  test("rejects an unknown provider", () => {
    process.env.WHATSAPP_PROVIDER = "twilio";
    assert.throws(() => getWhatsAppProvider(), /Unknown WHATSAPP_PROVIDER/);
  });

  test("no credentials → dry run that accepts without calling the network", async () => {
    stubFetch({ body: {} });
    const p = getWhatsAppProvider();
    assert.equal(isDryRun(p), true);
    const r = await p.sendTemplate({ to: "+919876543210", templateName: "t", languageCode: "en", category: "UTILITY", idempotencyKey: "k" });
    assert.equal(r.ok, true);
    assert.match(r.providerMessageId ?? "", /^dryrun-/);
    assert.equal(calls.length, 0);
  });
});

describe("meta-cloud adapter", () => {
  test("template send: no '+' on to, components built, idempotency key echoed", async () => {
    configureMeta();
    stubFetch({ body: { messages: [{ id: "wamid.ABC" }] } });
    const r = await getWhatsAppProvider().sendTemplate({
      to: "+919876543210",
      templateName: "weekly_land_report_v1",
      languageCode: "en",
      bodyParams: ["Nitesh"],
      buttonParams: [{ subType: "url", index: 0, value: "abc123" }],
      category: "MARKETING",
      idempotencyKey: "key-1",
    });
    assert.equal(r.ok, true);
    assert.equal(r.providerMessageId, "wamid.ABC");
    assert.equal(calls[0].url, "https://graph.facebook.com/v21.0/222/messages");
    assert.equal((calls[0].init.headers as Record<string, string>).Authorization, "Bearer token");
    const body = calls[0].body!;
    assert.equal(body.to, "919876543210");
    assert.deepEqual(body.template, {
      name: "weekly_land_report_v1",
      language: { code: "en" },
      components: [
        { type: "body", parameters: [{ type: "text", text: "Nitesh" }] },
        { type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: "abc123" }] },
      ],
    });
    assert.equal(body.biz_opaque_callback_data, "key-1");
  });

  test("maps Meta error codes onto normalised errors", async () => {
    configureMeta();
    const cases: Array<[number, number, string]> = [
      [131047, 400, "OUTSIDE_SESSION_WINDOW"],
      [132000, 400, "TEMPLATE_PARAM_MISMATCH"],
      [132001, 404, "TEMPLATE_NOT_FOUND"],
      [132015, 400, "TEMPLATE_NOT_APPROVED"],
      [131026, 400, "INVALID_NUMBER"],
      [190, 401, "AUTH_FAILED"],
    ];
    for (const [code, status, expected] of cases) {
      stubFetch({ status, body: { error: { message: "nope", code } } });
      const r = await getWhatsAppProvider().sendSessionMessage({ to: "+919876543210", text: "hi", idempotencyKey: "k" });
      assert.equal(r.ok, false);
      assert.equal(r.errorCode, expected, `Meta ${code}`);
      assert.equal(calls.length, 1, `Meta ${code} is not retried`);
    }
  });

  test("backs off and retries on 429 / 131056, then succeeds", async () => {
    configureMeta();
    stubFetch({ status: 429, body: { error: { message: "pair rate limit", code: 131056 } } }, { body: { messages: [{ id: "wamid.OK" }] } });
    const r = await getWhatsAppProvider().sendSessionMessage({ to: "+919876543210", text: "hi", idempotencyKey: "k" });
    assert.equal(r.ok, true);
    assert.equal(r.attempts, 2);
    assert.equal(calls.length, 2);
  });

  test("signature verification uses the raw body and rejects tampering", async () => {
    configureMeta();
    const p = getWhatsAppProvider();
    const raw = JSON.stringify({ object: "whatsapp_business_account", entry: [] });
    const good = new Request("https://x/api/webhooks/whatsapp", { method: "POST", headers: { "x-hub-signature-256": `sha256=${sign("app-secret", raw)}` } });
    assert.equal(await p.verifyWebhook(good, raw), true);
    assert.equal(await p.verifyWebhook(good, raw.replace("[]", "[{}]")), false, "tampered body");
    assert.equal(await p.verifyWebhook(good, JSON.stringify(JSON.parse(raw), null, 2)), false, "re-serialised body is not the raw body");
    const unsigned = new Request("https://x/api/webhooks/whatsapp", { method: "POST" });
    assert.equal(await p.verifyWebhook(unsigned, raw), false);
  });

  test("fails closed without an app secret", async () => {
    configureMeta();
    delete process.env.META_APP_SECRET;
    const raw = "{}";
    const req = new Request("https://x", { method: "POST", headers: { "x-hub-signature-256": `sha256=${sign("", raw)}` } });
    assert.equal(await getWhatsAppProvider().verifyWebhook(req, raw), false);
  });

  test("GET subscribe challenge", () => {
    configureMeta();
    const p = getWhatsAppProvider();
    const ok = p.handleWebhookChallenge!(new Request("https://x/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=verify-me&hub.challenge=12345"));
    assert.equal(ok?.status, 200);
    const bad = p.handleWebhookChallenge!(new Request("https://x/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=12345"));
    assert.equal(bad?.status, 403);
    assert.equal(p.handleWebhookChallenge!(new Request("https://x/api/webhooks/whatsapp")), null);
  });

  test("parses statuses, failures, template and quality updates", () => {
    const events = getProviderByName("meta-cloud").parseWebhook({
      object: "whatsapp_business_account",
      entry: [
        {
          changes: [
            {
              field: "messages",
              value: {
                statuses: [
                  { id: "wamid.1", status: "delivered", timestamp: "1727000000", recipient_id: "919876543210" },
                  { id: "wamid.2", status: "failed", timestamp: "1727000001", recipient_id: "919876543211", errors: [{ code: 131026, title: "Message undeliverable" }] },
                ],
              },
            },
            { field: "message_template_status_update", value: { event: "PAUSED", message_template_name: "weekly_land_report_v1", message_template_language: "en", reason: "LOW_QUALITY" } },
            { field: "phone_number_quality_update", value: { event: "FLAGGED", current_limit: "TIER_1K" } },
          ],
        },
      ],
    });
    assert.equal(events.length, 4);
    assert.equal(events[0].deliveryStatus, "DELIVERED");
    assert.equal(events[0].from, "+919876543210");
    assert.equal(events[1].deliveryStatus, "FAILED");
    assert.equal(events[1].failureCode, "INVALID_NUMBER");
    assert.equal(events[2].eventType, "TEMPLATE_STATUS");
    assert.equal(events[2].templateStatus, "PAUSED");
    assert.equal(events[3].eventType, "ACCOUNT_UPDATE");
    assert.equal(events[3].qualityRating, "RED");
  });

  test("template listing derives the parameter shape", async () => {
    configureMeta();
    stubFetch({
      body: {
        data: [
          {
            name: "signup_otp_v1",
            language: "en",
            category: "AUTHENTICATION",
            status: "APPROVED",
            components: [{ type: "BODY", text: "*{{1}}* is your code." }, { type: "BUTTONS", buttons: [{ type: "OTP", otp_type: "COPY_CODE" }] }],
          },
          {
            name: "weekly_land_report_v1",
            language: "en",
            category: "MARKETING",
            status: "APPROVED",
            components: [
              { type: "HEADER", format: "DOCUMENT" },
              { type: "BODY", text: "Hi {{1}}, {{2}} moved {{3}} this week. {{1}}" },
              { type: "BUTTONS", buttons: [{ type: "URL", url: "https://pt.in/r/{{1}}" }, { type: "QUICK_REPLY", text: "STOP" }] },
            ],
          },
        ],
      },
    });
    const [otp, weekly] = await getWhatsAppProvider().listTemplates();
    assert.deepEqual([otp.bodyParamCount, otp.hasHeaderParam, otp.buttonCount], [1, false, 1]);
    assert.deepEqual([weekly.bodyParamCount, weekly.hasHeaderParam, weekly.headerType, weekly.buttonCount], [3, true, "document", 1]);
  });
});

describe("BSP adapters reformat numbers themselves", () => {
  test("aisensy: API key in the body, destination without '+'", async () => {
    process.env.WHATSAPP_PROVIDER = "aisensy";
    process.env.AISENSY_API_KEY = "ais-key";
    resetProviderCache();
    stubFetch({ body: { success: "true", submitted_message_id: "ais-1" } });
    const r = await getWhatsAppProvider().sendTemplate({ to: "+919876543210", templateName: "enquiry_received_v1", languageCode: "en", bodyParams: ["Asha"], category: "UTILITY", idempotencyKey: "k" });
    assert.equal(r.ok, true);
    assert.equal(r.providerMessageId, "ais-1");
    assert.equal(calls[0].body!.apiKey, "ais-key");
    assert.equal(calls[0].body!.destination, "919876543210");
    assert.equal(calls[0].body!.campaignName, "enquiry_received_v1");
    assert.equal((calls[0].init.headers as Record<string, string>).Authorization, undefined);
  });

  test("aisensy: free-form text is an unsupported operation (not retryable)", async () => {
    process.env.WHATSAPP_PROVIDER = "aisensy";
    process.env.AISENSY_API_KEY = "ais-key";
    resetProviderCache();
    const r = await getWhatsAppProvider().sendSessionMessage({ to: "+919876543210", text: "hi", idempotencyKey: "k" });
    assert.equal(r.errorCode, "UNSUPPORTED_OPERATION");
    assert.equal(isRetryable(r.errorCode), false);
  });

  test("interakt: Basic auth, split country code, metadata in callbackData", async () => {
    process.env.WHATSAPP_PROVIDER = "interakt";
    process.env.INTERAKT_API_KEY = "aW50ZXJha3Q=";
    resetProviderCache();
    stubFetch({ body: { result: true, message: "Message created successfully", id: "int-1" } });
    const r = await getWhatsAppProvider().sendTemplate({
      to: "+971501234567",
      templateName: "site_visit_reminder_v1",
      languageCode: "en",
      bodyParams: ["Ravi", "Sat 10am"],
      category: "UTILITY",
      idempotencyKey: "key-9",
      metadata: { leadId: "L1" },
    });
    assert.equal(r.ok, true);
    const body = calls[0].body!;
    assert.equal((calls[0].init.headers as Record<string, string>).Authorization, "Basic aW50ZXJha3Q=");
    assert.equal(body.countryCode, "+971");
    assert.equal(body.phoneNumber, "501234567");
    assert.deepEqual(JSON.parse(body.callbackData as string), { k: "key-9", leadId: "L1" });
    assert.deepEqual((body.template as Record<string, unknown>).bodyValues, ["Ravi", "Sat 10am"]);
  });

  test("interakt: webhook signature over the raw body", async () => {
    process.env.WHATSAPP_PROVIDER = "interakt";
    process.env.INTERAKT_API_KEY = "x";
    process.env.INTERAKT_WEBHOOK_SECRET = "int-secret";
    resetProviderCache();
    const raw = JSON.stringify({ type: "message_received" });
    const p = getWhatsAppProvider();
    const req = new Request("https://x", { method: "POST", headers: { "interakt-signature": sign("int-secret", raw) } });
    assert.equal(await p.verifyWebhook(req, raw), true);
    assert.equal(await p.verifyWebhook(req, raw + " "), false);
  });

  test("wati: keeps the legacy session endpoint and shared-secret webhook", async () => {
    process.env.WHATSAPP_PROVIDER = "wati";
    process.env.WATI_API_ENDPOINT = "https://live-server.wati.io/123"; // legacy env name still honoured
    process.env.WATI_API_TOKEN = "wati-token";
    process.env.WATI_WEBHOOK_SECRET = "wati-secret";
    resetProviderCache();
    stubFetch({ body: { result: "success", message: { id: "wati-msg-1" } } });
    const p = getWhatsAppProvider();
    const r = await p.sendSessionMessage({ to: "+919876543210", text: "Hello there", idempotencyKey: "k" });
    assert.equal(r.providerMessageId, "wati-msg-1");
    assert.equal(calls[0].url, "https://live-server.wati.io/123/api/v1/sendSessionMessage/919876543210?messageText=Hello%20there");
    assert.equal(await p.verifyWebhook(new Request("https://x", { headers: { "x-wati-signature": "wati-secret" } }), "{}"), true);
    assert.equal(await p.verifyWebhook(new Request("https://x", { headers: { "x-wati-signature": "nope" } }), "{}"), false);
  });
});

describe("inbound normalisation is identical across providers", () => {
  const core = (e: NormalisedInboundEvent) => ({ eventType: e.eventType, from: e.from, messageType: e.messageType, text: e.text, senderName: e.senderName, providerMessageId: e.providerMessageId });
  const expected = { eventType: "MESSAGE_RECEIVED", from: "+919876543210", messageType: "text", text: "Is the Kokapet plot available?", senderName: "Asha", providerMessageId: "msg-1" };

  test("meta, wati, interakt and aisensy payloads → the same event", () => {
    const meta = getProviderByName("meta-cloud").parseWebhook({
      object: "whatsapp_business_account",
      entry: [
        {
          changes: [
            {
              field: "messages",
              value: {
                metadata: { display_phone_number: "919000000000" },
                contacts: [{ wa_id: "919876543210", profile: { name: "Asha" } }],
                messages: [{ from: "919876543210", id: "msg-1", timestamp: "1727000000", type: "text", text: { body: "Is the Kokapet plot available?" } }],
              },
            },
          ],
        },
      ],
    });
    const wati = getProviderByName("wati").parseWebhook({
      id: "internal-9", whatsappMessageId: "msg-1", eventType: "message", type: "text", text: "Is the Kokapet plot available?", waId: "919876543210", senderName: "Asha", owner: false, timestamp: "1727000000",
    });
    const interakt = getProviderByName("interakt").parseWebhook({
      type: "message_received",
      data: { customer: { country_code: "+91", phone_number: "9876543210", traits: { name: "Asha" } }, message: { id: "msg-1", message_content_type: "Text", message: "Is the Kokapet plot available?", received_at_utc: "2024-09-22T10:13:20Z" } },
    });
    const aisensy = getProviderByName("aisensy").parseWebhook({
      topic: "message.sender.user",
      data: { message: { messageId: "msg-1", phone_number: "919876543210", message_type: "TEXT", message_content: { text: "Is the Kokapet plot available?" }, userName: "Asha" } },
    });
    for (const [name, events] of Object.entries({ meta, wati, interakt, aisensy })) {
      assert.equal(events.length, 1, name);
      assert.deepEqual(core(events[0]), expected, name);
      assert.ok(events[0].timestamp instanceof Date && !Number.isNaN(events[0].timestamp.getTime()), `${name} timestamp`);
    }
  });
});

describe("pre-send template validation", () => {
  const row = { name: "weekly_land_report_v1", language: "en", status: "APPROVED", bodyParamCount: 2, hasHeaderParam: false, buttonCount: 1 };
  const button = [{ subType: "url" as const, index: 0, value: "r1" }];
  test("accepts a matching send", () => {
    assert.deepEqual(checkTemplateParams(row, { bodyParams: ["a", "b"], buttonParams: button }), { ok: true });
  });
  test("catches the wrong parameter count", () => {
    const r = checkTemplateParams(row, { bodyParams: ["a"], buttonParams: button });
    assert.equal(r.ok, false);
    assert.equal(!r.ok && r.code, "TEMPLATE_PARAM_MISMATCH");
  });
  test("catches missing button / unexpected header / unapproved", () => {
    assert.equal(checkTemplateParams(row, { bodyParams: ["a", "b"] }).ok, false);
    assert.equal(checkTemplateParams(row, { bodyParams: ["a", "b"], buttonParams: button, headerParams: { type: "text", value: "x" } }).ok, false);
    const paused = checkTemplateParams({ ...row, status: "PAUSED" }, { bodyParams: ["a", "b"], buttonParams: button });
    assert.equal(!paused.ok && paused.code, "TEMPLATE_NOT_APPROVED");
  });
});

describe("errors, cost, phone", () => {
  test("retryability and suppression follow the spec", () => {
    for (const c of ["RATE_LIMITED", "PROVIDER_UNAVAILABLE", "UNKNOWN"] as const) assert.equal(isRetryable(c), true, c);
    for (const c of ["INVALID_NUMBER", "NOT_OPTED_IN", "TEMPLATE_NOT_APPROVED", "TEMPLATE_PARAM_MISMATCH"] as const) assert.equal(isRetryable(c), false, c);
    assert.equal(shouldSuppress("INVALID_NUMBER"), true);
    assert.equal(shouldSuppress("NOT_OPTED_IN"), true);
    assert.equal(shouldSuppress("RATE_LIMITED"), false);
    assert.equal(codeFromMessage("Insufficient wallet balance"), "INSUFFICIENT_BALANCE");
    assert.equal(codeFromMessage("Campaign not live"), "TEMPLATE_NOT_APPROVED");
  });

  test("cost by category, env-overridable, service free within allowance", () => {
    assert.equal(estimateCostPaise("MARKETING"), 86);
    assert.equal(estimateCostPaise("UTILITY"), 13);
    assert.equal(estimateCostPaise("AUTHENTICATION"), 13);
    assert.equal(estimateCostPaise("SERVICE", 5000), 0);
    process.env.WA_RATE_MARKETING_PAISE = "90";
    process.env.WA_RATE_SERVICE_PAISE = "13";
    process.env.WA_SERVICE_FREE_TIER = "1000";
    assert.equal(ratesPaise().MARKETING, 90);
    assert.equal(estimateCostPaise("SERVICE", 999), 0);
    assert.equal(estimateCostPaise("SERVICE", 1000), 13);
  });

  test("E.164 normalisation", () => {
    assert.equal(toE164("9876543210"), "+919876543210");
    assert.equal(toE164("+91 98765 43210"), "+919876543210");
    assert.equal(toE164("09876543210"), "+919876543210");
    assert.equal(toE164("919876543210"), "+919876543210");
    assert.equal(toE164("+971 50 123 4567"), "+971501234567");
    assert.equal(toE164("12345"), null);
    assert.equal(toE164(""), null);
  });
});
