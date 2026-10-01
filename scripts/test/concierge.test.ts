/**
 * Concierge end-to-end against the dev database, via the SIMULATOR channel
 * (no WhatsApp sends). Claude is switched off so runs are deterministic.
 *
 *   npm run test:concierge
 *
 * Uses +9170001xxxxx numbers (outside the simulator's +9199900 range) and cleans up everything it creates.
 */
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import prisma from "../../src/lib/prisma";
import { handleConciergeInbound } from "../../src/lib/concierge/service";
import { sweepConcierge } from "../../src/lib/concierge/sweep";

process.env.CONCIERGE_AI = "off";
const PHONE = (n: number) => `+9170001${String(n).padStart(5, "0")}`;
const say = (n: number, input: { text?: string; optionId?: string }, name = "Asha Reddy") =>
  handleConciergeInbound({ phone: PHONE(n), senderName: name, channel: "SIMULATOR", ...input });

async function cleanup() {
  const leads = await prisma.lead.findMany({ where: { OR: [{ phone: { startsWith: "+9170001" } }, { phone: { startsWith: "70001" } }, { phone: { startsWith: "+971570001" } }] }, select: { id: true } });
  const ids = leads.map((l) => l.id);
  await prisma.projectLeadMatch.deleteMany({ where: { leadId: { in: ids } } });
  await prisma.conciergeConversation.deleteMany({ where: { OR: [{ phone: { startsWith: "+9170001" } }, { phone: { startsWith: "70001" } }, { phone: { startsWith: "+971570001" } }] } });
  const logs = await prisma.whatsAppLog.findMany({ where: { toPhone: { startsWith: "+9170001" } }, select: { id: true } });
  await prisma.whatsAppIdempotencyKey.deleteMany({ where: { logId: { in: logs.map((l) => l.id) } } });
  await prisma.whatsAppLog.deleteMany({ where: { id: { in: logs.map((l) => l.id) } } });
  await prisma.whatsAppSuppression.deleteMany({ where: { OR: [{ phone: { startsWith: "+9170001" } }, { phone: { startsWith: "70001" } }, { phone: { startsWith: "+971570001" } }] } });
  await prisma.whatsAppWebhookEvent.deleteMany({ where: { fromPhone: { startsWith: "+9170001" } } });
  await prisma.lead.deleteMany({ where: { id: { in: ids } } });
  const users = await prisma.user.findMany({ where: { OR: [{ phone: { startsWith: "+9170001" } }, { phone: { startsWith: "70001" } }, { phone: { startsWith: "+971570001" } }] }, select: { id: true } });
  const uids = users.map((u) => u.id);
  const reports = await prisma.weeklyReport.findMany({ where: { userId: { in: uids } }, select: { id: true } });
  await prisma.reportItem.deleteMany({ where: { reportId: { in: reports.map((r) => r.id) } } }).catch(() => null);
  await prisma.reportDelivery.deleteMany({ where: { reportId: { in: reports.map((r) => r.id) } } });
  await prisma.weeklyReport.deleteMany({ where: { userId: { in: uids } } });
  await prisma.reportPreference.deleteMany({ where: { userId: { in: uids } } });
  await prisma.user.deleteMany({ where: { id: { in: uids } } });
}

before(cleanup);
after(async () => {
  await cleanup();
  await prisma.$disconnect();
});

describe("full conversation", () => {
  test("taps through to matches, CRM lead, persona, report and weekly opt-in", async () => {
    const r1 = await say(1, { text: "Hi, saw your ad" });
    assert.match(r1.replies[0].text, /Hi Asha 👋/);
    await say(1, { optionId: "p:INVESTMENT" });
    await say(1, { optionId: "t:OPEN_PLOT" });
    await say(1, { optionId: "a:shadnagar" });
    await say(1, { text: "35 lakhs" });
    await say(1, { optionId: "h:7" });
    const done = await say(1, { text: "need a home loan" });

    assert.equal(done.state, "COMPLETED");
    const texts = done.replies.map((r) => r.text).join("\n---\n");
    assert.match(texts, /Finding your best matches/);
    assert.match(texts, /⭐ \*\d(\.\d)?\/10\*/);
    assert.match(texts, /not financial advice/);

    const conv = await prisma.conciergeConversation.findUniqueOrThrow({ where: { id: done.conversationId }, include: { messages: true } });
    assert.ok(conv.leadId && conv.userId);
    assert.ok(conv.messages.filter((m) => m.direction === "IN").length === 7);

    const lead = await prisma.lead.findUniqueOrThrow({ where: { id: conv.leadId! }, include: { matches: true } });
    assert.equal(lead.purpose, "INVESTMENT");
    assert.deepEqual(lead.wantedTypes, ["OPEN_PLOT"]);
    assert.deepEqual(lead.preferredAreas, ["shadnagar"]);
    assert.equal(lead.budget, 35);
    assert.equal(lead.persona, "LAND_BANKER");
    assert.equal(lead.requirements, "need a home loan");
    assert.equal(lead.sourceChannel, "WHATSAPP_BUSINESS");
    assert.match(lead.email, /@whatsapp\.propertytiger\.invalid$/);
    assert.ok(lead.matches.length >= 1, "CRM matches written");

    const user = await prisma.user.findUniqueOrThrow({ where: { id: conv.userId! }, include: { reportPreference: true } });
    assert.equal(user.reportPreference?.isActive, false, "no weekly sends before consent");
    assert.deepEqual(user.reportPreference?.propertyTypes, ["PLOT"]);

    if (conv.reportUrl) {
      assert.match(conv.reportUrl, /\/report\/[a-z0-9]+$/);
      assert.match(texts, /\/report\//);
      const delivery = await prisma.reportDelivery.findFirst({ where: { reportId: conv.reportId!, channel: "WHATSAPP" } });
      assert.equal(delivery?.status, "SUPPRESSED"); // simulator: never queued for a real send
      assert.equal(await prisma.reportDelivery.count({ where: { reportId: conv.reportId!, channel: "EMAIL" } }), 0, "no email to a placeholder");
    }

    const weekly = await say(1, { optionId: "c:WEEKLY" });
    assert.match(weekly.replies[0].text, /every week/);
    const pref = await prisma.reportPreference.findUniqueOrThrow({ where: { userId: conv.userId! } });
    assert.equal(pref.isActive, true);
  });

  test("a rich first message skips answered questions; numbers and typed answers work", async () => {
    const r = await say(2, { text: "Looking for a villa for my family in Kokapet, budget 1.5 crore" }, "Ravi");
    assert.match(r.replies[0].text, /Got it: \*villa · around Kokapet · /);
    assert.match(r.replies[0].text, /When would you like to move in/);
    await say(2, { text: "1" }); // → Ready now
    const done = await say(2, { optionId: "x:SKIP" });
    assert.equal(done.state, "COMPLETED");
    const lead = await prisma.lead.findFirstOrThrow({ where: { phone: PHONE(2) } });
    assert.equal(lead.purpose, "OWN_USE");
    assert.equal(lead.timeline, "READY");
    assert.equal(lead.persona, "FAMILY_UPGRADER");
  });

  test("asking for a person mid-way hands off and saves a partial lead", async () => {
    await say(3, { text: "hello" });
    await say(3, { optionId: "p:INVESTMENT" });
    const r = await say(3, { text: "can I talk to an agent" });
    assert.equal(r.state, "HANDOFF");
    assert.match(r.replies[0].text, /advisor/);
    const lead = await prisma.lead.findFirstOrThrow({ where: { phone: PHONE(3) } });
    assert.equal(lead.purpose, "INVESTMENT");
    const silent = await say(3, { text: "are you there?" });
    assert.equal(silent.replies.length, 0, "the bot stays quiet once a person owns the chat");
  });

  test("site visit after results hands off; RESTART starts a fresh search", async () => {
    for (const input of [{ text: "hi" }, { optionId: "p:OWN_USE" }, { optionId: "t:APARTMENT" }, { optionId: "a:ANY" }, { optionId: "b:30-60" }, { optionId: "tl:LATER" }, { optionId: "x:SKIP" }]) {
      await say(4, input);
    }
    const visit = await say(4, { optionId: "c:VISIT" });
    assert.equal(visit.state, "HANDOFF");
    const again = await say(4, { text: "restart" });
    assert.equal(again.state, "ACTIVE");
    assert.match(again.replies[0].text, /Is this for \*investment\*/);
  });
});

describe("sweep", () => {
  test("conversations silent for 72h are abandoned and saved as leads", async () => {
    await say(5, { text: "hi" });
    await say(5, { optionId: "p:INVESTMENT" });
    await prisma.conciergeConversation.updateMany({ where: { phone: PHONE(5) }, data: { lastInboundAt: new Date(Date.now() - 80 * 3600_000) } });
    const r = await sweepConcierge();
    assert.ok(r.abandoned >= 1);
    const conv = await prisma.conciergeConversation.findFirstOrThrow({ where: { phone: PHONE(5) } });
    assert.equal(conv.state, "ABANDONED");
    assert.ok(conv.leadId);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Deeper DB behaviour
// ─────────────────────────────────────────────────────────────────────────
import { takeOver, handBack, agentReply } from "../../src/lib/concierge/service";
import { handleEvent } from "../../src/lib/whatsapp/events";
import { sendEmail } from "../../src/lib/email/client";

const TAPS = [{ optionId: "p:INVESTMENT" }, { optionId: "t:OPEN_PLOT" }, { optionId: "a:ANY" }, { optionId: "b:30-60" }, { optionId: "h:7" }, { optionId: "x:SKIP" }];

async function completeFlow(n: number, name = "Asha Reddy") {
  await say(n, { text: "hi" }, name);
  let last;
  for (const t of TAPS) last = await say(n, t, name);
  return last!;
}

describe("races and identity", () => {
  test("two first messages at once open exactly one conversation and one intro", async () => {
    await Promise.all([say(10, { text: "hi" }), say(10, { text: "hello" })]);
    const convs = await prisma.conciergeConversation.findMany({ where: { phone: PHONE(10) }, include: { messages: true } });
    assert.equal(convs.length, 1, "one conversation");
    const intros = convs[0].messages.filter((m) => m.direction === "OUT" && /I'm Property Tiger's property assistant/.test(m.text));
    assert.equal(intros.length, 1, "one intro");
    assert.equal(convs[0].messages.filter((m) => m.direction === "IN").length, 2, "both messages recorded");
  });

  test("an existing lead (10-digit phone, real email) is updated, not duplicated", async () => {
    const existing = await prisma.lead.create({
      data: { name: "Ravi (portal)", email: "ravi.portal@example.com", phone: PHONE(11).slice(3), budget: 20, horizon: 2, city: "Hyderabad", source: "portal" },
    });
    await completeFlow(11, "Ravi Kumar");
    const leads = await prisma.lead.findMany({ where: { phone: { contains: PHONE(11).slice(-10) } } });
    assert.equal(leads.length, 1);
    assert.equal(leads[0].id, existing.id);
    assert.equal(leads[0].email, "ravi.portal@example.com", "real email kept");
    assert.equal(leads[0].name, "Ravi (portal)", "existing name kept");
    assert.equal(leads[0].purpose, "INVESTMENT");
    assert.equal(leads[0].budget, 60);
    assert.match(leads[0].notes ?? "", /WhatsApp concierge/);
  });

  test("an existing website user is reused and their delivery settings are not touched", async () => {
    const user = await prisma.user.create({ data: { email: "anu.site@example.com", name: "Anu", phone: PHONE(12).slice(3) } });
    await prisma.reportPreference.create({ data: { userId: user.id, channelEmail: true, channelWhatsApp: false, frequency: "MONTHLY", isActive: true } });
    await completeFlow(12, "Anu");
    assert.equal(await prisma.user.count({ where: { phone: { contains: PHONE(12).slice(-10) } } }), 1, "no placeholder user created");
    const pref = await prisma.reportPreference.findUniqueOrThrow({ where: { userId: user.id } });
    assert.equal(pref.channelEmail, true);
    assert.equal(pref.channelWhatsApp, false);
    assert.equal(pref.frequency, "MONTHLY");
    assert.equal(pref.isActive, true);
    assert.equal(pref.budgetMaxLakh, 60, "what they want now is updated");
    const lead = await prisma.lead.findFirstOrThrow({ where: { phone: PHONE(12) } });
    assert.equal(lead.userId, user.id);
  });

  test("a non-Indian number is flagged NRI and gets the NRI persona", async () => {
    const r = await handleConciergeInbound({ phone: "+971570001001", senderName: "Sameer", channel: "SIMULATOR", text: "hi" });
    for (const t of TAPS) await handleConciergeInbound({ phone: "+971570001001", senderName: "Sameer", channel: "SIMULATOR", ...t });
    const lead = await prisma.lead.findFirstOrThrow({ where: { phone: "+971570001001" } });
    assert.equal(lead.isNri, true);
    assert.equal(lead.persona, "NRI_INVESTOR");
    assert.ok(r.conversationId);
  });
});

describe("conversation paths", () => {
  test("skipping everything still completes, with area suggestions and a lead", async () => {
    await say(13, { text: "hi" });
    let last;
    for (let i = 0; i < 6; i++) last = await say(13, { text: "skip" });
    assert.equal(last!.state, "COMPLETED");
    const text = last!.replies.map((r) => r.text).join("\n");
    assert.match(text, /Best areas for you|top matches|closest options|where I'd look/);
    const lead = await prisma.lead.findFirstOrThrow({ where: { phone: PHONE(13) } });
    assert.equal(lead.budget, 0);
    assert.ok(lead.persona);
  });

  test("an unknown locality reaches the lead as a requirement", async () => {
    await say(14, { text: "hi" });
    await say(14, { optionId: "p:OWN_USE" });
    await say(14, { optionId: "t:APARTMENT" });
    await say(14, { text: "Gachibowli" });
    await say(14, { optionId: "b:60-100" });
    await say(14, { optionId: "tl:READY" });
    await say(14, { text: "skip" });
    const lead = await prisma.lead.findFirstOrThrow({ where: { phone: PHONE(14) } });
    assert.match(lead.requirements ?? "", /Prefers area: Gachibowli/);
  });

  test("media mid-flow gets a friendly nudge and the same question again", async () => {
    await say(15, { text: "hi" });
    const r = await handleConciergeInbound({ phone: PHONE(15), channel: "SIMULATOR", messageType: "image" });
    assert.match(r.replies[0].text, /only read text/);
    assert.match(r.replies[1].text, /investment/);
  });

  test("messages while matching get a 'one moment' reply", async () => {
    await say(16, { text: "hi" });
    await prisma.conciergeConversation.updateMany({ where: { phone: PHONE(16) }, data: { state: "PROCESSING" } });
    const r = await say(16, { text: "hello?" });
    assert.match(r.replies[0].text, /One moment/);
  });

  test("a numbered reply after results books the site visit", async () => {
    await completeFlow(17);
    const r = await say(17, { text: "1" });
    assert.equal(r.state, "HANDOFF");
    const conv = await prisma.conciergeConversation.findFirstOrThrow({ where: { phone: PHONE(17) } });
    assert.equal(conv.handoffReason, "site visit");
  });

  test("restart after results runs a fresh search on the same lead", async () => {
    await completeFlow(18);
    const before = await prisma.conciergeConversation.findFirstOrThrow({ where: { phone: PHONE(18) } });
    assert.ok(before.reportUrl);
    const r = await say(18, { text: "restart" });
    assert.equal(r.state, "ACTIVE");
    const after = await prisma.conciergeConversation.findUniqueOrThrow({ where: { id: before.id } });
    assert.equal(after.reportUrl, null);
    assert.deepEqual(after.slots, { name: "Asha Reddy" });
    for (const t of [{ optionId: "p:OWN_USE" }, { optionId: "t:VILLA" }, { optionId: "a:ANY" }, { optionId: "b:100-200" }, { optionId: "tl:READY" }, { optionId: "x:SKIP" }]) await say(18, t);
    const leads = await prisma.lead.findMany({ where: { phone: PHONE(18) } });
    assert.equal(leads.length, 1, "same lead");
    assert.equal(leads[0].purpose, "OWN_USE", "profile updated to the new search");
  });

  test("a month-old conversation is closed and a new one started", async () => {
    await say(19, { text: "hi" });
    const old = await prisma.conciergeConversation.findFirstOrThrow({ where: { phone: PHONE(19) } });
    await prisma.$executeRaw`UPDATE "ConciergeConversation" SET "updatedAt" = (now() at time zone 'utc') - interval '40 days' WHERE id = ${old.id}`;
    const r = await say(19, { text: "hi again" });
    assert.notEqual(r.conversationId, old.id);
    const closed = await prisma.conciergeConversation.findUniqueOrThrow({ where: { id: old.id } });
    assert.equal(closed.state, "ABANDONED");
    assert.equal(closed.openKey, null);
  });

  test("transcript: every message stored in order, with options on interactive replies", async () => {
    await say(20, { text: "hi" });
    await say(20, { optionId: "p:INVESTMENT" });
    const msgs = await prisma.conciergeMessage.findMany({ where: { conversation: { phone: PHONE(20) } }, orderBy: { createdAt: "asc" } });
    assert.deepEqual(msgs.map((m) => m.direction), ["IN", "OUT", "IN", "OUT"]);
    assert.deepEqual((msgs[1].payload as { buttons: Array<{ id: string }> }).buttons.map((b) => b.id), ["p:INVESTMENT", "p:OWN_USE", "p:BOTH"]);
    assert.equal((msgs[3].payload as { list: { rows: unknown[] } }).list.rows.length, 9);
    assert.deepEqual(msgs[2].payload, { optionId: "p:INVESTMENT" });
  });
});

describe("CRM actions", () => {
  test("take over pauses the bot, advisor replies are recorded, hand back resumes", async () => {
    await say(21, { text: "hi" });
    const conv = await prisma.conciergeConversation.findFirstOrThrow({ where: { phone: PHONE(21) } });
    await takeOver(conv.id);
    const silent = await say(21, { optionId: "p:INVESTMENT" });
    assert.equal(silent.replies.length, 0);
    const r = await agentReply(conv.id, "Hi, this is Priya from Property Tiger");
    assert.equal(r.ok, true);
    const agentMsg = await prisma.conciergeMessage.findFirstOrThrow({ where: { conversationId: conv.id, author: "agent" } });
    assert.equal(agentMsg.direction, "OUT");
    await handBack(conv.id);
    const back = await prisma.conciergeConversation.findUniqueOrThrow({ where: { id: conv.id } });
    assert.equal(back.state, "ACTIVE");
    const resumed = await say(21, { optionId: "p:INVESTMENT" });
    assert.match(resumed.replies[0].text, /What kind of property/);
  });
});

describe("WhatsApp channel (dry run: no provider credentials in the test env)", () => {
  test("replies go through the provider layer and are logged under the concierge feature", async () => {
    const r = await handleConciergeInbound({ phone: PHONE(22), senderName: "Kiran", channel: "WHATSAPP", text: "hi" });
    assert.equal(r.replies.length, 1);
    const log = await prisma.whatsAppLog.findFirstOrThrow({ where: { toPhone: PHONE(22) } });
    assert.equal(log.feature, "concierge");
    assert.equal(log.category, "SERVICE");
    assert.equal(log.status, "SENT");
    const out = await prisma.conciergeMessage.findFirstOrThrow({ where: { conversation: { phone: PHONE(22) }, direction: "OUT" } });
    assert.ok(out.providerMessageId, "provider message id stored on the transcript");
  });

  test("the sweep nudges once after 2h of silence, but never a suppressed number", async () => {
    await handleConciergeInbound({ phone: PHONE(23), senderName: "Kiran", channel: "WHATSAPP", text: "hi" });
    await handleConciergeInbound({ phone: PHONE(24), senderName: "Kiran", channel: "WHATSAPP", text: "hi" });
    const threeHoursAgo = new Date(Date.now() - 3 * 3600_000);
    await prisma.conciergeConversation.updateMany({ where: { phone: { in: [PHONE(23), PHONE(24)] } }, data: { lastInboundAt: threeHoursAgo } });
    await prisma.whatsAppSuppression.create({ data: { phone: PHONE(24), reason: "STOP_KEYWORD" } });
    await sweepConcierge();
    await sweepConcierge(); // second run must not nudge again
    const nudges = async (n: number) =>
      prisma.conciergeMessage.count({ where: { conversation: { phone: PHONE(n) }, direction: "OUT", text: { contains: "Still there" } } });
    assert.equal(await nudges(23), 1);
    assert.equal(await nudges(24), 0);
  });

  test("STOP mid-conversation closes the chat so it is never nudged", async () => {
    await handleConciergeInbound({ phone: PHONE(25), senderName: "Kiran", channel: "WHATSAPP", text: "hi" });
    await handleEvent({ eventType: "MESSAGE_RECEIVED", from: PHONE(25), messageType: "text", text: "STOP", timestamp: new Date(), rawPayload: {} }, "evt-stop-25");
    const conv = await prisma.conciergeConversation.findFirstOrThrow({ where: { phone: PHONE(25) } });
    assert.equal(conv.state, "ABANDONED");
    assert.equal(conv.openKey, null);
    assert.ok(await prisma.whatsAppSuppression.findUnique({ where: { phone: PHONE(25) } }));
  });
});

describe("email safety", () => {
  test("placeholder addresses are never emailed", async () => {
    const r = await sendEmail({ to: "wa917000199999@whatsapp.propertytiger.invalid", subject: "x", html: "x" });
    assert.equal(r.ok, false);
    assert.match(r.error ?? "", /placeholder/);
  });
});
