import { test } from "node:test";
import assert from "node:assert/strict";
import { isValidMobile, leadAlertRecipients, phone10, planIntake, type ExistingLead } from "./plan";
import { isPlaceholderEmail } from "../placeholder-email";

const NOW = new Date("2026-11-11T06:00:00Z");
const base = { name: "Asha Rao", phone: "+91 98765 43210", source: "listing_enquiry", note: 'Enquiry on listing "Sky Towers"' };
const existing: ExistingLead = { id: "lead1", name: "Asha Rao", email: "asha@example.com", phone: "9876543210", budget: null, horizon: null, notes: "first note", userId: null, projectId: "p1" };

test("phone10 ignores country code and formatting", () => {
  assert.equal(phone10("+91 98765-43210"), "9876543210");
  assert.equal(phone10("09876543210"), "9876543210");
  assert.equal(phone10("12345"), "");
  assert.equal(phone10(null), "");
});

test("isValidMobile accepts Indian mobiles only", () => {
  assert.ok(isValidMobile("+91 98765 43210"));
  assert.ok(isValidMobile("6000000001"));
  assert.ok(!isValidMobile("1234567890"));
  assert.ok(!isValidMobile("98765"));
  assert.ok(!isValidMobile(""));
});

test("a new lead carries no invented budget, horizon or email", () => {
  const plan = planIntake(null, base, NOW);
  assert.equal(plan.action, "create");
  if (plan.action !== "create") return;
  assert.equal(plan.data.budget, null);
  assert.equal(plan.data.horizon, null);
  assert.ok(isPlaceholderEmail(plan.data.email), "phone-only lead gets the internal placeholder");
  assert.equal(plan.data.city, "Hyderabad");
  assert.match(plan.data.notes, /^\[11 Nov 2026 · listing_enquiry\] Enquiry on listing "Sky Towers"$/);
});

test("a stated budget and email are kept as given", () => {
  const plan = planIntake(null, { ...base, email: " Asha@Example.com ", budgetLakh: 85, horizonYears: 5 }, NOW);
  if (plan.action !== "create") return assert.fail("expected create");
  assert.equal(plan.data.budget, 85);
  assert.equal(plan.data.horizon, 5);
  assert.equal(plan.data.email, "asha@example.com");
});

test("zero or negative figures count as not stated", () => {
  const plan = planIntake(null, { ...base, budgetLakh: 0, horizonYears: -2 }, NOW);
  if (plan.action !== "create") return assert.fail("expected create");
  assert.equal(plan.data.budget, null);
  assert.equal(plan.data.horizon, null);
});

test("a repeat enquiry is added to the existing lead", () => {
  const plan = planIntake(existing, { ...base, projectId: "p2", note: 'Enquiry on listing "Lake View"' }, NOW);
  assert.equal(plan.action, "update");
  if (plan.action !== "update") return;
  assert.equal(plan.id, "lead1");
  assert.equal(plan.data.notes, 'first note\n[11 Nov 2026 · listing_enquiry] Enquiry on listing "Lake View"');
  assert.equal(plan.data.projectId, "p2", "latest listing of interest");
  assert.equal(plan.data.budget, null, "silence doesn't set a budget");
});

test("a repeat enquiry can add a budget but never erases one", () => {
  const withBudget = planIntake({ ...existing, budget: 60 }, base, NOW);
  if (withBudget.action !== "update") return assert.fail("expected update");
  assert.equal(withBudget.data.budget, 60);
  const newer = planIntake({ ...existing, budget: 60 }, { ...base, budgetLakh: 90 }, NOW);
  if (newer.action !== "update") return assert.fail("expected update");
  assert.equal(newer.data.budget, 90, "the latest stated figure wins");
});

test("a real email replaces a placeholder, not the other way round", () => {
  const upgraded = planIntake({ ...existing, email: "9876543210@no-email.local" }, { ...base, email: "asha@example.com" }, NOW);
  if (upgraded.action !== "update") return assert.fail("expected update");
  assert.equal(upgraded.data.email, "asha@example.com");
  const kept = planIntake(existing, { ...base, email: null }, NOW);
  if (kept.action !== "update") return assert.fail("expected update");
  assert.equal(kept.data.email, "asha@example.com");
});

test("a stand-in name is replaced, a real one is kept", () => {
  const generic = planIntake({ ...existing, name: "Client" }, base, NOW);
  if (generic.action !== "update") return assert.fail("expected update");
  assert.equal(generic.data.name, "Asha Rao");
  const real = planIntake(existing, { ...base, name: "A. Rao" }, NOW);
  if (real.action !== "update") return assert.fail("expected update");
  assert.equal(real.data.name, "Asha Rao");
});

test("legacy stand-in addresses count as placeholders", () => {
  assert.ok(isPlaceholderEmail("9333333333@no-email.local"));
  assert.ok(isPlaceholderEmail("inboundenquiry1234@inbound.uv"));
  assert.ok(!isPlaceholderEmail("buyer@gmail.com"));
});

test("alert recipients fall back from lead to ops to admin", () => {
  assert.deepEqual(leadAlertRecipients({ LEAD_ALERT_EMAIL: "a@x.in, b@x.in", ADMIN_EMAIL: "admin@x.in" }), ["a@x.in", "b@x.in"]);
  assert.deepEqual(leadAlertRecipients({ OPS_ALERT_EMAIL: "ops@x.in", ADMIN_EMAIL: "admin@x.in" }), ["ops@x.in"]);
  assert.deepEqual(leadAlertRecipients({ ADMIN_EMAIL: "admin@x.in" }), ["admin@x.in"]);
  assert.deepEqual(leadAlertRecipients({}), []);
});
