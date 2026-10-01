/**
 * Concierge HTTP API — drives the running dev server like the CRM does.
 *
 *   npm run dev                # one terminal
 *   npm run test:concierge-api # another
 */
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { req, login, Jar, ADMIN, freshClient } from "./helpers";
import prisma from "../../src/lib/prisma";

const PHONE = "+91 70003 00001";
const E164 = "+917000300001";
let admin: Jar;

async function cleanup() {
  const leads = await prisma.lead.findMany({ where: { OR: [{ phone: { startsWith: "+9170003" } }, { phone: { startsWith: "70003" } }, { phone: { startsWith: "+971570003" } }] }, select: { id: true } });
  await prisma.projectLeadMatch.deleteMany({ where: { leadId: { in: leads.map((l) => l.id) } } });
  await prisma.conciergeConversation.deleteMany({ where: { OR: [{ phone: { startsWith: "+9170003" } }, { phone: { startsWith: "70003" } }, { phone: { startsWith: "+971570003" } }] } });
  await prisma.lead.deleteMany({ where: { id: { in: leads.map((l) => l.id) } } });
  const users = await prisma.user.findMany({ where: { OR: [{ phone: { startsWith: "+9170003" } }, { phone: { startsWith: "70003" } }, { phone: { startsWith: "+971570003" } }] }, select: { id: true } });
  const uids = users.map((u) => u.id);
  const reports = await prisma.weeklyReport.findMany({ where: { userId: { in: uids } }, select: { id: true } });
  await prisma.reportItem.deleteMany({ where: { reportId: { in: reports.map((r) => r.id) } } });
  await prisma.reportDelivery.deleteMany({ where: { reportId: { in: reports.map((r) => r.id) } } });
  await prisma.weeklyReport.deleteMany({ where: { userId: { in: uids } } });
  await prisma.reportPreference.deleteMany({ where: { userId: { in: uids } } });
  await prisma.user.deleteMany({ where: { id: { in: uids } } });
}

before(async () => {
  const health = await req("/api/projects");
  assert.equal(health.status, 200, "dev server must be running");
  await cleanup();
  admin = await login(ADMIN.email, ADMIN.password);
});
after(async () => {
  await cleanup();
  await prisma.$disconnect();
});

describe("access control", () => {
  for (const [method, path] of [
    ["GET", "/api/admin/concierge/conversations"],
    ["GET", "/api/admin/concierge/conversations/x"],
    ["POST", "/api/admin/concierge/conversations/x"],
    ["POST", "/api/admin/concierge/simulate"],
    ["DELETE", "/api/admin/concierge/simulate?phone=%2B917000300001"],
  ] as const) {
    test(`${method} ${path} without a session → 401`, async () => {
      const r = await req(path, { method, body: method === "POST" ? {} : undefined });
      assert.equal(r.status, 401);
    });
  }
  test("a logged-in customer (not an admin) is refused with 403", async () => {
    const c = freshClient();
    const signup = await req("/api/auth/signup", { method: "POST", body: c });
    assert.ok([200, 201].includes(signup.status), `signup ${signup.status}`);
    const jar = await login(c.email, c.password);
    for (const [method, path] of [["GET", "/api/admin/concierge/conversations"], ["POST", "/api/admin/concierge/simulate"]] as const) {
      const r = await req(path, { method, jar, body: method === "POST" ? { phone: PHONE, text: "hi" } : undefined });
      assert.equal(r.status, 403, `${method} ${path}`);
    }
    const page = await req("/admin/concierge", { jar });
    assert.ok([302, 307].includes(page.status), "CRM page redirects a customer");
    await prisma.user.deleteMany({ where: { email: c.email } });
  });

  test("CRM pages redirect anonymous visitors to login", async () => {
    for (const path of ["/admin/concierge", "/admin/concierge/simulator"]) {
      const r = await req(path);
      assert.ok([302, 307].includes(r.status), `${path} → ${r.status}`);
    }
  });
});

describe("simulate", () => {
  test("validation: bad phone, empty message", async () => {
    assert.equal((await req("/api/admin/concierge/simulate", { method: "POST", jar: admin, body: { phone: "12", text: "hi" } })).status, 400);
    assert.equal((await req("/api/admin/concierge/simulate", { method: "POST", jar: admin, body: { phone: PHONE } })).status, 400);
    assert.equal((await req("/api/admin/concierge/simulate", { method: "POST", jar: admin, body: { phone: "abcdefghij", text: "hi" } })).status, 400);
  });

  let conversationId = "";
  test("a full chat over HTTP ends with a lead and a report", async () => {
    const first = await req("/api/admin/concierge/simulate", { method: "POST", jar: admin, body: { phone: PHONE, name: "Deepa", text: "villa for my family in Kompally, budget 1.2 crore" } });
    assert.equal(first.status, 200);
    conversationId = first.body.conversationId;
    assert.match(first.body.replies[0].text, /Got it: \*villa · around Kompally/);
    await req("/api/admin/concierge/simulate", { method: "POST", jar: admin, body: { phone: PHONE, optionId: "tl:READY" } });
    const done = await req("/api/admin/concierge/simulate", { method: "POST", jar: admin, body: { phone: PHONE, optionId: "x:SKIP" } });
    assert.equal(done.status, 200);
    assert.equal(done.body.state, "COMPLETED");
    assert.ok(done.body.leadId);
    if (done.body.reportUrl) {
      const page = await req(new URL(done.body.reportUrl).pathname);
      assert.equal(page.status, 200, "report page renders");
      assert.match(page.text, /noindex/);
    }
  });

  test("conversation list: filters, funnel, provider status", async () => {
    const all = await req("/api/admin/concierge/conversations?channel=SIMULATOR", { jar: admin });
    assert.equal(all.status, 200);
    const row = all.body.conversations.find((c: { id: string }) => c.id === conversationId);
    assert.ok(row, "listed");
    assert.equal(row.state, "COMPLETED");
    assert.equal(all.body.funnel[0].step, "STARTED");
    assert.ok(all.body.funnel.at(-1).count >= 1);
    assert.equal(typeof all.body.whatsapp.ok, "boolean");
    const handoffOnly = await req("/api/admin/concierge/conversations?channel=SIMULATOR&state=HANDOFF", { jar: admin });
    assert.ok(handoffOnly.body.conversations.every((c: { state: string }) => c.state === "HANDOFF"));
    const search = await req(`/api/admin/concierge/conversations?channel=SIMULATOR&q=${encodeURIComponent("Deepa")}`, { jar: admin });
    assert.ok(search.body.conversations.some((c: { id: string }) => c.id === conversationId));
  });

  test("detail + actions: take over, reply, hand back, bad input", async () => {
    const d = await req(`/api/admin/concierge/conversations/${conversationId}`, { jar: admin });
    assert.equal(d.status, 200);
    assert.ok(d.body.messages.length >= 5);
    assert.deepEqual(d.body.areaNames, ["Kompally"]);
    assert.equal((await req(`/api/admin/concierge/conversations/nope`, { jar: admin })).status, 404);

    const act = (body: unknown) => req(`/api/admin/concierge/conversations/${conversationId}`, { method: "POST", jar: admin, body });
    assert.equal((await act({ action: "takeover" })).status, 200);
    assert.equal((await act({ action: "reply", text: "   " })).status, 400);
    assert.equal((await act({ action: "reply", text: "Hi Deepa, Priya here from Property Tiger." })).status, 200);
    assert.equal((await act({ action: "dance" })).status, 400);
    assert.equal((await act({ action: "handback" })).status, 200);
    const after = await req(`/api/admin/concierge/conversations/${conversationId}`, { jar: admin });
    assert.equal(after.body.state, "COMPLETED");
    assert.ok(after.body.messages.some((m: { author: string }) => m.author === "agent"));
  });

  test("the lead API exposes the buyer profile and the conversation", async () => {
    const conv = await prisma.conciergeConversation.findUniqueOrThrow({ where: { id: conversationId } });
    const lead = await req(`/api/admin/leads/${conv.leadId}`, { jar: admin });
    assert.equal(lead.status, 200);
    assert.equal(lead.body.lead.purpose, "OWN_USE");
    assert.deepEqual(lead.body.lead.wantedTypes, ["VILLA"]);
    assert.equal(lead.body.lead.persona, "FAMILY_UPGRADER");
    assert.equal(lead.body.lead.conversations[0].id, conversationId);
  });

  test("reset deletes simulator conversations but keeps the lead", async () => {
    const r = await req(`/api/admin/concierge/simulate?phone=${encodeURIComponent(E164)}`, { method: "DELETE", jar: admin });
    assert.equal(r.status, 200);
    assert.equal(r.body.deleted, 1);
    assert.equal(await prisma.conciergeMessage.count({ where: { conversationId } }), 0, "messages cascade");
    assert.ok(await prisma.lead.findFirst({ where: { phone: E164 } }));
  });
});

describe("listing buyer-fit API", () => {
  let projectId = "";
  test("a new listing with no fit fields gets derived defaults", async () => {
    const r = await req("/api/admin/projects", {
      method: "POST",
      jar: admin,
      body: {
        name: "ZZ Test Commercial Plaza", developer: "Test", corridor: "Kokapet", minBudgetLakhs: 80, maxBudgetLakhs: 250,
        minHorizonYears: 3, maxHorizonYears: 8, riskLevel: "MEDIUM", propertyType: "Commercial", description: "test", status: "ARCHIVED",
      },
    });
    assert.equal(r.status, 200);
    projectId = r.body.project.id;
    assert.deepEqual(r.body.project.listingTypes, ["COMMERCIAL_SPACE"]);
    assert.ok(r.body.project.targetPersonas.includes("COMMERCIAL_INVESTOR"));
  });
  test("explicit fit fields are saved as given; invalid values rejected", async () => {
    const ok = await req(`/api/admin/projects/${projectId}`, {
      method: "PUT",
      jar: admin,
      body: { listingTypes: ["COMMERCIAL_PLOT"], purposes: ["INVESTMENT"], targetPersonas: ["HNI_PORTFOLIO_BUILDER"], expectedRentalYieldPct: 6.5 },
    });
    assert.equal(ok.status, 200);
    assert.deepEqual(ok.body.project.listingTypes, ["COMMERCIAL_PLOT"]);
    assert.deepEqual(ok.body.project.targetPersonas, ["HNI_PORTFOLIO_BUILDER"]);
    assert.equal(ok.body.project.expectedRentalYieldPct, 6.5);
    const bad = await req(`/api/admin/projects/${projectId}`, { method: "PUT", jar: admin, body: { listingTypes: ["CASTLE"] } });
    assert.equal(bad.status, 400);
    const badYield = await req(`/api/admin/projects/${projectId}`, { method: "PUT", jar: admin, body: { expectedRentalYieldPct: 99 } });
    assert.equal(badYield.status, 400);
    await prisma.project.delete({ where: { id: projectId } });
  });
});
