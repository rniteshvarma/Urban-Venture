/**
 * Concierge over real WhatsApp webhooks — signed Meta payloads in, provider
 * API calls out (fetch is stubbed, nothing leaves the machine).
 *
 *   npm run test:concierge-wa
 */
import { test, describe, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import prisma from "../../src/lib/prisma";
import { resetProviderCache } from "../../src/lib/whatsapp";
import { drainWebhookProcessing, handleWhatsAppWebhook } from "../../src/lib/whatsapp/webhook";
import { handleEvent } from "../../src/lib/whatsapp/events";

/** For BSPs: their webhook parsing is unit-tested; feed the normalised event directly. */
async function deliverEvent(from: string, body: string) {
  await handleEvent({ eventType: "MESSAGE_RECEIVED", from, messageType: "text", text: body, senderName: "Kiran", providerMessageId: `bsp-${++seq}`, timestamp: new Date(), rawPayload: {} }, `evt-${seq}`);
}

process.env.CONCIERGE_AI = "off";
const PHONE = (n: number) => `+9170002${String(n).padStart(5, "0")}`;
const realFetch = globalThis.fetch;
type Sent = { url: string; body: Record<string, unknown> };
let sent: Sent[] = [];
let seq = 0;
let failNext = false;

function stubProviderApi() {
  sent = [];
  globalThis.fetch = (async (url: string | URL, init: RequestInit = {}) => {
    const u = String(url);
    let body: Record<string, unknown> = {};
    try {
      body = JSON.parse(String(init.body ?? "{}"));
    } catch {
      /* not JSON */
    }
    if (u.includes("/messages") || u.includes("interakt") || u.includes("aisensy") || u.includes("wati")) sent.push({ url: u, body });
    if (failNext && u.includes("/messages")) {
      failNext = false;
      return new Response(JSON.stringify({ error: { message: "Re-engagement message", code: 131047 } }), { status: 400 });
    }
    const payload = u.includes("wati") ? { result: "success", message: { id: `wati-${++seq}` } } : u.includes("interakt") ? { result: true, id: `int-${++seq}` } : u.includes("aisensy") ? { success: "true", submitted_message_id: `ais-${++seq}` } : { messages: [{ id: `wamid.zzc${++seq}` }] };
    return new Response(JSON.stringify(payload), { status: 200 });
  }) as typeof fetch;
}

function useProvider(name: "meta-cloud" | "interakt" | "aisensy" | "wati") {
  process.env.WATI_API_URL = "https://live-server.wati.test/123";
  process.env.WATI_API_TOKEN = "wati-token";
  process.env.WHATSAPP_PROVIDER = name;
  process.env.META_WABA_ID = "111";
  process.env.META_PHONE_NUMBER_ID = "222";
  process.env.META_SYSTEM_USER_TOKEN = "token";
  process.env.META_APP_SECRET = "app-secret";
  process.env.INTERAKT_API_KEY = "key";
  process.env.AISENSY_API_KEY = "key";
  resetProviderCache();
}

/** A signed Meta webhook carrying one inbound message. */
function inbound(from: string, message: Record<string, unknown>, name = "Kiran") {
  const payload = {
    object: "whatsapp_business_account",
    entry: [
      {
        changes: [
          {
            field: "messages",
            value: {
              contacts: [{ wa_id: from.slice(1), profile: { name } }],
              messages: [{ from: from.slice(1), id: `wamid.in${++seq}`, timestamp: String(Math.floor(Date.now() / 1000)), ...message }],
            },
          },
        ],
      },
    ],
  };
  const raw = JSON.stringify(payload);
  return {
    raw,
    req: () =>
      new Request("http://localhost/api/webhooks/whatsapp", {
        method: "POST",
        body: raw,
        headers: { "x-hub-signature-256": `sha256=${createHmac("sha256", "app-secret").update(raw).digest("hex")}` },
      }),
  };
}

async function deliver(from: string, message: Record<string, unknown>) {
  const m = inbound(from, message);
  const res = await handleWhatsAppWebhook(m.req());
  assert.equal(res.status, 200);
  await drainWebhookProcessing();
  return m;
}

const text = (body: string) => ({ type: "text", text: { body } });
const button = (id: string, title: string) => ({ type: "interactive", interactive: { type: "button_reply", button_reply: { id, title } } });
const listReply = (id: string, title: string) => ({ type: "interactive", interactive: { type: "list_reply", list_reply: { id, title } } });

async function cleanup() {
  const leads = await prisma.lead.findMany({ where: { OR: [{ phone: { startsWith: "+9170002" } }, { phone: { startsWith: "70002" } }, { phone: { startsWith: "+971570002" } }] }, select: { id: true } });
  await prisma.projectLeadMatch.deleteMany({ where: { leadId: { in: leads.map((l) => l.id) } } });
  await prisma.conciergeConversation.deleteMany({ where: { OR: [{ phone: { startsWith: "+9170002" } }, { phone: { startsWith: "70002" } }, { phone: { startsWith: "+971570002" } }] } });
  await prisma.lead.deleteMany({ where: { id: { in: leads.map((l) => l.id) } } });
  const logs = await prisma.whatsAppLog.findMany({ where: { toPhone: { startsWith: "+9170002" } }, select: { id: true } });
  await prisma.whatsAppIdempotencyKey.deleteMany({ where: { logId: { in: logs.map((l) => l.id) } } });
  await prisma.whatsAppLog.deleteMany({ where: { id: { in: logs.map((l) => l.id) } } });
  await prisma.whatsAppWebhookEvent.deleteMany({ where: { fromPhone: { startsWith: "+9170002" } } });
  const users = await prisma.user.findMany({ where: { OR: [{ phone: { startsWith: "+9170002" } }, { phone: { startsWith: "70002" } }, { phone: { startsWith: "+971570002" } }] }, select: { id: true } });
  const uids = users.map((u) => u.id);
  const reports = await prisma.weeklyReport.findMany({ where: { userId: { in: uids } }, select: { id: true } });
  await prisma.reportItem.deleteMany({ where: { reportId: { in: reports.map((r) => r.id) } } });
  await prisma.reportDelivery.deleteMany({ where: { reportId: { in: reports.map((r) => r.id) } } });
  await prisma.weeklyReport.deleteMany({ where: { userId: { in: uids } } });
  await prisma.reportPreference.deleteMany({ where: { userId: { in: uids } } });
  await prisma.user.deleteMany({ where: { id: { in: uids } } });
}

before(cleanup);
after(async () => {
  globalThis.fetch = realFetch;
  await cleanup();
  await prisma.$disconnect();
});
beforeEach(stubProviderApi);

describe("Meta Cloud API", () => {
  before(() => useProvider("meta-cloud"));

  test("a text message gets an interactive reply-button message, correctly shaped", async () => {
    await deliver(PHONE(1), text("Hi"));
    assert.equal(sent.length, 1);
    const b = sent[0].body as { to: string; type: string; interactive: { type: string; body: { text: string }; action: { buttons: Array<{ reply: { id: string; title: string } }> } } };
    assert.equal(sent[0].url, "https://graph.facebook.com/v21.0/222/messages");
    assert.equal(b.to, PHONE(1).slice(1), "no leading +");
    assert.equal(b.type, "interactive");
    assert.equal(b.interactive.type, "button");
    assert.match(b.interactive.body.text, /Hi Kiran 👋/);
    assert.deepEqual(b.interactive.action.buttons.map((x) => x.reply.id), ["p:INVESTMENT", "p:OWN_USE", "p:BOTH"]);
  });

  test("a button tap advances; the next question is a list with ≤10 rows", async () => {
    await deliver(PHONE(1), button("p:INVESTMENT", "Investment"));
    const b = sent.at(-1)!.body as { interactive: { type: string; action: { button: string; sections: Array<{ rows: Array<{ id: string; title: string }> }> } } };
    assert.equal(b.interactive.type, "list");
    assert.equal(b.interactive.action.button, "Choose type");
    const rows = b.interactive.action.sections[0].rows;
    assert.ok(rows.length <= 10 && rows.every((r) => r.title.length <= 24));
  });

  test("a list selection advances too", async () => {
    await deliver(PHONE(1), listReply("t:OPEN_PLOT", "Open plot"));
    const conv = await prisma.conciergeConversation.findFirstOrThrow({ where: { phone: PHONE(1) } });
    assert.deepEqual((conv.slots as { types: string[] }).types, ["OPEN_PLOT"]);
    assert.equal(conv.step, "AREA");
  });

  test("a redelivered webhook is processed once — no duplicate reply", async () => {
    const m = await deliver(PHONE(1), listReply("a:ANY", "Suggest for me"));
    const before = sent.length;
    const again = await handleWhatsAppWebhook(new Request("http://localhost/api/webhooks/whatsapp", {
      method: "POST",
      body: m.raw,
      headers: { "x-hub-signature-256": `sha256=${createHmac("sha256", "app-secret").update(m.raw).digest("hex")}` },
    }));
    assert.equal(again.status, 200);
    await drainWebhookProcessing();
    assert.equal(sent.length, before);
    const ins = await prisma.conciergeMessage.count({ where: { conversation: { phone: PHONE(1) }, direction: "IN", payload: { equals: { optionId: "a:ANY" } } } });
    assert.equal(ins, 1);
  });

  test("finishing over WhatsApp sends results and a report link, and logs every send", async () => {
    await deliver(PHONE(1), listReply("b:30-60", "₹30 – 60 lakh"));
    await deliver(PHONE(1), button("h:7", "5+ years"));
    await deliver(PHONE(1), button("x:SKIP", "Skip"));
    const bodies = sent.map((s) => JSON.stringify(s.body)).join("\n");
    assert.match(bodies, /Finding your best matches/);
    assert.match(bodies, /not financial advice/);
    const conv = await prisma.conciergeConversation.findFirstOrThrow({ where: { phone: PHONE(1) } });
    assert.equal(conv.state, "COMPLETED");
    if (conv.reportUrl) {
      assert.match(bodies, /\/report\//);
      const d = await prisma.reportDelivery.findFirst({ where: { reportId: conv.reportId!, channel: "WHATSAPP" } });
      assert.equal(d?.status, "SENT", "the report delivery is marked sent — no second send later");
    }
    const logs = await prisma.whatsAppLog.count({ where: { toPhone: PHONE(1), feature: "concierge", status: "SENT" } });
    const outs = await prisma.conciergeMessage.count({ where: { conversationId: conv.id, direction: "OUT" } });
    assert.equal(logs, outs, "one WhatsApp log per outbound concierge message");
  });

  test("an image message gets a polite text-only reply", async () => {
    await deliver(PHONE(2), text("hi"));
    await deliver(PHONE(2), { type: "image", image: { id: "media-1" } });
    const last = JSON.stringify(sent.at(-2)?.body ?? {}) + JSON.stringify(sent.at(-1)?.body ?? {});
    assert.match(last, /only read text/);
  });
});

describe("Interakt (no interactive messages): numbered text", () => {
  before(() => useProvider("interakt"));

  test("questions arrive as numbered text, and '2' picks the second option", async () => {
    await deliverEvent(PHONE(3), "hello");
    const first = sent.at(-1)!.body as { type: string; data: { message: string } };
    assert.equal(first.type, "Text");
    assert.match(first.data.message, /1️⃣ Investment\n2️⃣ Own use\n3️⃣ Both/);
    await deliverEvent(PHONE(3), "2");
    const conv = await prisma.conciergeConversation.findFirstOrThrow({ where: { phone: PHONE(3) } });
    assert.equal((conv.slots as { purpose: string }).purpose, "OWN_USE");
  });
});

describe("AiSensy (templates only): concierge stands down", () => {
  before(() => useProvider("aisensy"));

  test("inbound messages are saved to a lead and nothing is sent", async () => {
    await deliverEvent(PHONE(4), "Is the Kokapet villa available?");
    assert.equal(sent.length, 0, "no reply attempted");
    assert.equal(await prisma.conciergeConversation.count({ where: { phone: PHONE(4) } }), 0);
    const lead = await prisma.lead.findFirst({ where: { phone: { contains: PHONE(4).slice(-10) } } });
    assert.ok(lead, "lead captured the old way");
    await new Promise((r) => setTimeout(r, 1500)); // let the background welcome trigger finish before cleanup
  });
});

describe("WATI (rollback provider): numbered text over its session endpoint", () => {
  before(() => useProvider("wati"));

  test("questions go out as numbered text and '1' is understood", async () => {
    await deliverEvent(PHONE(5), "hi");
    const first = sent.at(-1)!;
    assert.match(first.url, /\/api\/v1\/sendSessionMessage\/917000200005\?messageText=/);
    assert.match(decodeURIComponent(first.url), /1️⃣ Investment/);
    await deliverEvent(PHONE(5), "1");
    const conv = await prisma.conciergeConversation.findFirstOrThrow({ where: { phone: PHONE(5) } });
    assert.equal((conv.slots as { purpose: string }).purpose, "INVESTMENT");
  });
});

describe("advisor replies outside the 24h window", () => {
  before(() => useProvider("meta-cloud"));

  test("the send failure is reported back to the CRM, not swallowed", async () => {
    const { agentReply, takeOver } = await import("../../src/lib/concierge/service");
    await deliver(PHONE(6), text("hi"));
    const conv = await prisma.conciergeConversation.findFirstOrThrow({ where: { phone: PHONE(6) } });
    await takeOver(conv.id);
    failNext = true;
    const r = await agentReply(conv.id, "Hi, following up on your enquiry");
    assert.equal(r.ok, false);
    assert.match(r.error ?? "", /24 hours/);
    const log = await prisma.whatsAppLog.findFirstOrThrow({ where: { toPhone: PHONE(6), normalisedError: "OUTSIDE_SESSION_WINDOW" } });
    assert.equal(log.status, "FAILED");
  });
});
