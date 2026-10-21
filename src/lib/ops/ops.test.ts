import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { jobHealth, JOBS, type RunLite } from "./schedule";

const daily = { job: "x", label: "X", everyHours: 24 };
const now = new Date("2026-10-21T12:00:00Z");
const h = (hoursAgo: number) => new Date(now.getTime() - hoursAgo * 3_600_000);
const run = (hoursAgo: number, ok: boolean | null, finished = ok !== null): RunLite => ({ startedAt: h(hoursAgo), finishedAt: finished ? h(hoursAgo - 0.05) : null, ok });

describe("job health", () => {
  test("a recent success is OK", () => assert.equal(jobHealth(daily, [run(10, true)], now).health, "OK"));
  test("nothing recorded is NEVER_RAN", () => assert.equal(jobHealth(daily, [], now).health, "NEVER_RAN"));
  test("the latest run failing is FAILED even if an older one succeeded", () => assert.equal(jobHealth(daily, [run(2, false), run(26, true)], now).health, "FAILED"));
  test("a failure followed by a success is OK again", () => assert.equal(jobHealth(daily, [run(2, true), run(26, false)], now).health, "OK"));
  test("no success within 1.5× the schedule is STALE (a missed run)", () => {
    assert.equal(jobHealth(daily, [run(37, true)], now).health, "STALE");
    assert.equal(jobHealth(daily, [run(35, true)], now).health, "OK");
  });
  test("a run still open after 10 minutes was killed → FAILED; under 10 → RUNNING", () => {
    assert.equal(jobHealth(daily, [run(0.05, null, false), run(24, true)], now).health, "RUNNING");
    assert.equal(jobHealth(daily, [run(1, null, false), run(24, true)], now).health, "FAILED");
  });
  test("weekly jobs get a weekly allowance", () => {
    const weekly = { job: "w", label: "W", everyHours: 168 };
    assert.equal(jobHealth(weekly, [run(200, true)], now).health, "OK");
    assert.equal(jobHealth(weekly, [run(260, true)], now).health, "STALE");
  });
  test("every cron in vercel.json is monitored", async () => {
    const { readFileSync } = await import("node:fs");
    const crons: { path: string }[] = JSON.parse(readFileSync("vercel.json", "utf8")).crons;
    const known = new Set(JOBS.map((j) => j.job));
    for (const c of crons) assert.ok(known.has(c.path.split("/").pop()!), `${c.path} isn't in JOBS`);
  });
});
