/**
 * Concierge flow matrix — every option of every question driven end-to-end
 * into the CRM, plus the after-results, keyword, return and race paths.
 * SIMULATOR channel (no WhatsApp sends) unless a test says otherwise.
 *
 *   npm run test:concierge-flows
 */
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import prisma from "../../src/lib/prisma";
import { handleConciergeInbound } from "../../src/lib/concierge/service";
import { sweepConcierge } from "../../src/lib/concierge/sweep";
import { handleEvent } from "../../src/lib/whatsapp/events";

process.env.CONCIERGE_AI = "off";
let n = 0;
const nextPhone = () => `+9170004${String(++n).padStart(5, "0")}`;

async function chat(phone: string, inputs: Array<{ text?: string; optionId?: string }>, channel: "SIMULATOR" | "WHATSAPP" = "SIMULATOR", name = "Meera Rao") {
  let last;
  for (const i of inputs) last = await handleConciergeInbound({ phone, senderName: name, channel, ...i });
  return last!;
}

async function cleanup() {
  const leads = await prisma.lead.findMany({ where: { OR: [{ phone: { startsWith: "+9170004" } }, { phone: { startsWith: "70004" } }, { phone: { startsWith: "+971570004" } }] }, select: { id: true } });
  await prisma.projectLeadMatch.deleteMany({ where: { leadId: { in: leads.map((l) => l.id) } } });
  await prisma.conciergeConversation.deleteMany({ where: { OR: [{ phone: { startsWith: "+9170004" } }, { phone: { startsWith: "70004" } }, { phone: { startsWith: "+971570004" } }] } });
  const logs = await prisma.whatsAppLog.findMany({ where: { toPhone: { startsWith: "+9170004" } }, select: { id: true } });
  await prisma.whatsAppIdempotencyKey.deleteMany({ where: { logId: { in: logs.map((l) => l.id) } } });
  await prisma.whatsAppLog.deleteMany({ where: { id: { in: logs.map((l) => l.id) } } });
  await prisma.whatsAppSuppression.deleteMany({ where: { OR: [{ phone: { startsWith: "+9170004" } }, { phone: { startsWith: "70004" } }, { phone: { startsWith: "+971570004" } }] } });
  await prisma.lead.deleteMany({ where: { id: { in: leads.map((l) => l.id) } } });
  const users = await prisma.user.findMany({ where: { OR: [{ phone: { startsWith: "+9170004" } }, { phone: { startsWith: "70004" } }, { phone: { startsWith: "+971570004" } }] }, select: { id: true } });
  const uids = users.map((u) => u.id);
  const reports = await prisma.weeklyReport.findMany({ where: { userId: { in: uids } }, select: { id: true } });
  await prisma.reportItem.deleteMany({ where: { reportId: { in: reports.map((r) => r.id) } } });
  await prisma.reportDelivery.deleteMany({ where: { reportId: { in: reports.map((r) => r.id) } } });
  await prisma.weeklyReport.deleteMany({ where: { userId: { in: uids } } });
  await prisma.reportPreference.deleteMany({ where: { userId: { in: uids } } });
  await prisma.user.deleteMany({ where: { id: { in: uids } } });
  await prisma.project.deleteMany({ where: { name: { startsWith: "ZZ Flow" } } });
}

before(cleanup);
after(async () => {
  await cleanup();
  await prisma.$disconnect();
});

// ── Every property type × both purposes ────────────────────────────────
const TYPES = ["OPEN_PLOT", "VILLA_PLOT", "VILLA", "APARTMENT", "INDEPENDENT_HOUSE", "FARM_LAND", "COMMERCIAL_PLOT", "COMMERCIAL_SPACE", "NOT_SURE"] as const;
const EXPECTED_PERSONA: Record<string, { INVESTMENT: string; OWN_USE: string }> = {
  OPEN_PLOT: { INVESTMENT: "LAND_BANKER", OWN_USE: "SELF_BUILD_HOMEOWNER" },
  VILLA_PLOT: { INVESTMENT: "LAND_BANKER", OWN_USE: "SELF_BUILD_HOMEOWNER" },
  VILLA: { INVESTMENT: "RENTAL_INCOME_SEEKER", OWN_USE: "FAMILY_UPGRADER" },
  APARTMENT: { INVESTMENT: "RENTAL_INCOME_SEEKER", OWN_USE: "PROFESSIONAL_FIRST_HOME" },
  INDEPENDENT_HOUSE: { INVESTMENT: "RENTAL_INCOME_SEEKER", OWN_USE: "FAMILY_UPGRADER" },
  FARM_LAND: { INVESTMENT: "FARMLAND_LIFESTYLE", OWN_USE: "FARMLAND_LIFESTYLE" },
  COMMERCIAL_PLOT: { INVESTMENT: "COMMERCIAL_INVESTOR", OWN_USE: "COMMERCIAL_INVESTOR" },
  COMMERCIAL_SPACE: { INVESTMENT: "COMMERCIAL_INVESTOR", OWN_USE: "COMMERCIAL_INVESTOR" },
  NOT_SURE: { INVESTMENT: "LAND_BANKER", OWN_USE: "PROFESSIONAL_FIRST_HOME" },
};

describe("every property type, for investment and for own use", () => {
  const inventoryTypes = new Set<string>();
  before(async () => {
    const rows = await prisma.project.findMany({ where: { status: "ACTIVE", listingStatus: "APPROVED" }, select: { listingTypes: true } });
    for (const r of rows) r.listingTypes.forEach((t) => inventoryTypes.add(t));
  });

  for (const type of TYPES) {
    for (const purpose of ["INVESTMENT", "OWN_USE"] as const) {
      test(`${type} · ${purpose}`, async () => {
        const phone = nextPhone();
        const last = purpose === "INVESTMENT" ? { optionId: "h:4" } : { optionId: "tl:WITHIN_1Y" };
        const done = await chat(phone, [{ text: "hi" }, { optionId: `p:${purpose}` }, { optionId: `t:${type}` }, { optionId: "a:ANY" }, { optionId: "b:60-100" }, last, { optionId: "x:SKIP" }]);
        assert.equal(done.state, "COMPLETED");
        const lead = await prisma.lead.findFirstOrThrow({ where: { phone } });
        assert.deepEqual(lead.wantedTypes, type === "NOT_SURE" ? [] : [type]);
        assert.equal(lead.purpose, purpose);
        assert.equal(lead.persona, EXPECTED_PERSONA[type][purpose], `persona for ${type}/${purpose}`);
        const results = done.replies.map((r) => r.text).join("\n");
        assert.match(results, /not financial advice/);
        // Honesty: a type we have no stock of is never announced as "top matches".
        if (type !== "NOT_SURE" && !inventoryTypes.has(type)) {
          assert.doesNotMatch(results, /top matches/, `${type} has no stock — must not claim matches`);
          assert.match(results, /closest options|where I'd look/);
        }
        if (purpose === "OWN_USE") assert.equal(lead.timeline, "WITHIN_1Y");
        else assert.equal(lead.horizon, 4);
      });
    }
  }
});

describe("every budget band and every timing", () => {
  const BANDS: Array<[string, number | null, number | null]> = [
    ["b:0-30", 0, 30],
    ["b:30-60", 30, 60],
    ["b:60-100", 60, 100],
    ["b:100-200", 100, 200],
    ["b:200-", 200, 400],
    ["b:NA", null, null],
  ];
  for (const [option, min, max] of BANDS) {
    test(`budget ${option}`, async () => {
      const phone = nextPhone();
      await chat(phone, [{ text: "hi" }, { optionId: "p:INVESTMENT" }, { optionId: "t:OPEN_PLOT" }, { optionId: "a:ANY" }, { optionId: option }, { optionId: "h:2" }, { optionId: "x:SKIP" }]);
      const lead = await prisma.lead.findFirstOrThrow({ where: { phone } });
      assert.equal(lead.budgetMinLakh, min);
      assert.equal(lead.budget, max ?? 0);
      assert.equal(lead.horizon, 2);
      assert.equal(lead.persona, max !== null && max >= 150 ? "HNI_PORTFOLIO_BUILDER" : "LAND_SPECULATOR");
    });
  }
  for (const [option, expected] of [["tl:READY", "READY"], ["tl:WITHIN_1Y", "WITHIN_1Y"], ["tl:LATER", "LATER"]] as const) {
    test(`move-in ${option}`, async () => {
      const phone = nextPhone();
      await chat(phone, [{ text: "hi" }, { optionId: "p:OWN_USE" }, { optionId: "t:APARTMENT" }, { optionId: "a:ANY" }, { optionId: "b:30-60" }, { optionId: option }, { optionId: "x:SKIP" }]);
      assert.equal((await prisma.lead.findFirstOrThrow({ where: { phone } })).timeline, expected);
    });
  }
  test("'Both' asks the holding period, not move-in", async () => {
    const phone = nextPhone();
    const r = await chat(phone, [{ text: "hi" }, { optionId: "p:BOTH" }, { optionId: "t:VILLA" }, { optionId: "a:ANY" }, { optionId: "b:100-200" }]);
    assert.match(r.replies[0].text, /How long do you plan to hold/);
  });
});

describe("after the results", () => {
  test("'Talk to advisor' hands off with the right reason", async () => {
    const phone = nextPhone();
    await chat(phone, [{ text: "hi" }, { text: "skip" }, { text: "skip" }, { text: "skip" }, { text: "skip" }, { text: "skip" }, { text: "skip" }]);
    const r = await chat(phone, [{ optionId: "c:ADVISOR" }]);
    assert.equal(r.state, "HANDOFF");
    const conv = await prisma.conciergeConversation.findFirstOrThrow({ where: { phone } });
    assert.equal(conv.handoffReason, "asked for advisor");
  });

  test("a typed follow-up question is passed to an advisor", async () => {
    const phone = nextPhone();
    await chat(phone, [{ text: "hi" }, { text: "skip" }, { text: "skip" }, { text: "skip" }, { text: "skip" }, { text: "skip" }, { text: "skip" }]);
    const r = await chat(phone, [{ text: "Is the Shadnagar plot east facing?" }]);
    assert.equal(r.state, "HANDOFF");
    assert.match(r.replies[0].text, /passed your message to our advisor/);
    const conv = await prisma.conciergeConversation.findFirstOrThrow({ where: { phone } });
    assert.equal(conv.handoffReason, "follow-up after results");
  });

  test("'3' after results = weekly updates", async () => {
    const phone = nextPhone();
    await chat(phone, [{ text: "hi" }, { text: "skip" }, { text: "skip" }, { text: "skip" }, { text: "skip" }, { text: "skip" }, { text: "skip" }]);
    const r = await chat(phone, [{ text: "3" }]);
    assert.match(r.replies[0].text, /every week/);
    const conv = await prisma.conciergeConversation.findFirstOrThrow({ where: { phone } });
    assert.equal(conv.weeklyOptIn, true);
  });
});

describe("keywords over WhatsApp", () => {
  const evt = (from: string, text: string) =>
    handleEvent({ eventType: "MESSAGE_RECEIVED", from, messageType: "text", text, senderName: "Meera", timestamp: new Date(), rawPayload: {} }, `evt-${from}-${text}-${Date.now()}`);

  test("PAUSE after results pauses the weekly report for 4 weeks", async () => {
    const phone = nextPhone();
    await chat(phone, [{ text: "hi" }, { text: "skip" }, { text: "skip" }, { text: "skip" }, { text: "skip" }, { text: "skip" }, { text: "skip" }, { optionId: "c:WEEKLY" }], "WHATSAPP");
    await evt(phone, "PAUSE");
    const user = await prisma.user.findFirstOrThrow({ where: { phone }, include: { reportPreference: true } });
    const until = user.reportPreference!.pausedUntil!;
    assert.ok(until.getTime() > Date.now() + 27 * 86_400_000 && until.getTime() < Date.now() + 29 * 86_400_000);
  });

  test("STOP then START: suppressed, then a fresh conversation on the next message", async () => {
    const phone = nextPhone();
    await chat(phone, [{ text: "hi" }, { optionId: "p:INVESTMENT" }], "WHATSAPP");
    await evt(phone, "STOP");
    assert.ok(await prisma.whatsAppSuppression.findUnique({ where: { phone } }));
    await evt(phone, "START");
    assert.equal(await prisma.whatsAppSuppression.findUnique({ where: { phone } }), null);
    const r = await handleConciergeInbound({ phone, senderName: "Meera", channel: "WHATSAPP", text: "hi again" });
    const convs = await prisma.conciergeConversation.findMany({ where: { phone }, orderBy: { createdAt: "asc" } });
    assert.equal(convs.length, 2);
    assert.equal(convs[0].state, "ABANDONED");
    assert.equal(r.conversationId, convs[1].id);
    assert.match(r.replies[0].text, /I'm Property Tiger's property assistant/);
  });
});

describe("returning customers and recovery", () => {
  test("someone abandoned by the sweep who comes back starts fresh, and the lead is kept", async () => {
    const phone = nextPhone();
    await chat(phone, [{ text: "hi" }, { optionId: "p:OWN_USE" }]);
    await prisma.conciergeConversation.updateMany({ where: { phone }, data: { lastInboundAt: new Date(Date.now() - 80 * 3600_000) } });
    await sweepConcierge();
    const r = await chat(phone, [{ text: "hello, still looking" }]);
    const convs = await prisma.conciergeConversation.findMany({ where: { phone } });
    assert.equal(convs.length, 2);
    assert.equal(r.state, "ACTIVE");
    assert.equal(await prisma.lead.count({ where: { phone } }), 1);
  });

  test("a chat stuck in matching for 15+ minutes is handed to a person", async () => {
    const phone = nextPhone();
    await chat(phone, [{ text: "hi" }]);
    const conv = await prisma.conciergeConversation.findFirstOrThrow({ where: { phone } });
    await prisma.$executeRaw`UPDATE "ConciergeConversation" SET state = 'PROCESSING', "updatedAt" = (now() at time zone 'utc') - interval '20 minutes' WHERE id = ${conv.id}`;
    const r = await sweepConcierge();
    assert.ok(r.recovered >= 1);
    const after = await prisma.conciergeConversation.findUniqueOrThrow({ where: { id: conv.id } });
    assert.equal(after.state, "HANDOFF");
  });
});

describe("races mid-conversation", () => {
  test("two different answers arriving together are both kept, in one conversation", async () => {
    const phone = nextPhone();
    await chat(phone, [{ text: "hi" }]);
    await Promise.all([
      handleConciergeInbound({ phone, senderName: "Meera", channel: "SIMULATOR", optionId: "p:INVESTMENT" }),
      handleConciergeInbound({ phone, senderName: "Meera", channel: "SIMULATOR", optionId: "t:VILLA" }),
    ]);
    const convs = await prisma.conciergeConversation.findMany({ where: { phone } });
    assert.equal(convs.length, 1);
    const slots = convs[0].slots as { purpose?: string; types?: string[] };
    assert.equal(slots.purpose, "INVESTMENT");
    assert.deepEqual(slots.types, ["VILLA"]);
    assert.equal(convs[0].step, "AREA");
  });
});

describe("inventory sources", () => {
  test("a seller-submitted listing with no buyer-fit tags is still matched", async () => {
    const seller = await prisma.project.create({
      data: {
        name: "ZZ Flow Seller Farm", developer: "Owner", corridor: "Shadnagar", minBudgetLakhs: 20, maxBudgetLakhs: 40, minHorizonYears: 3, maxHorizonYears: 10,
        riskLevel: "MEDIUM", propertyType: "Farm land", description: "seller", listingSource: "SELLER", listingStatus: "APPROVED", status: "ACTIVE", reviewState: "PUBLISHED",
      },
    });
    const phone = nextPhone();
    const done = await chat(phone, [{ text: "hi" }, { optionId: "p:OWN_USE" }, { optionId: "t:FARM_LAND" }, { optionId: "a:shadnagar" }, { optionId: "b:30-60" }, { optionId: "tl:LATER" }, { optionId: "x:SKIP" }]);
    const results = done.replies.map((r) => r.text).join("\n");
    assert.match(results, /ZZ Flow Seller Farm/);
    assert.match(results, /top matches/, "an exact type match in stock is a real match");
    const lead = await prisma.lead.findFirstOrThrow({ where: { phone }, include: { matches: true } });
    assert.ok(lead.matches.some((m) => m.projectId === seller.id));
  });
});
