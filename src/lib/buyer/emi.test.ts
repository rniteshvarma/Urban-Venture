import { test } from "node:test";
import assert from "node:assert/strict";
import { amortise, emi } from "./costs";

test("₹80 L at 8.5% over 20 years is about ₹69,426 a month", () => {
  assert.ok(Math.abs(emi(80, 8.5, 20) - 69426) < 2);
});

test("amortisation pays the loan off and interest + principal add up", () => {
  const a = amortise(50, 9, 15);
  const principal = a.rows.reduce((t, r) => t + r.principal, 0);
  assert.ok(Math.abs(principal - 5_000_000) < 50);
  assert.equal(a.rows.at(-1)!.balance, 0);
  // The last instalment is smaller than a full EMI, so allow one EMI of difference.
  assert.ok(Math.abs(a.totalInterest - (a.emi * a.months - 5_000_000)) < a.emi);
});

test("a prepayment shortens the loan and saves interest", () => {
  const base = amortise(60, 8.75, 20);
  const pre = amortise(60, 8.75, 20, { lakh: 10, afterYear: 3 });
  assert.ok(pre.months < base.months);
  assert.ok(pre.totalInterest < base.totalInterest);
});
