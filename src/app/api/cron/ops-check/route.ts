/**
 * GET /api/cron/ops-check — daily. Checks every scheduled job's last run and
 * the last day's server errors, prunes old monitoring rows, and emails the
 * admin (OPS_ALERT_EMAIL, else ADMIN_EMAIL) when something needs attention.
 * Protected with CRON_SECRET.
 */
import { NextResponse } from "next/server";
import { withJobRun } from "@/lib/ops/record";
import { jobStatuses, pruneOps, recentErrors } from "@/lib/ops/status";
import { sendEmail } from "@/lib/email/client";

export const dynamic = "force-dynamic";

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

async function handler() {
  const [jobs, errors, pruned] = await Promise.all([jobStatuses(), recentErrors(24), pruneOps()]);
  // This run is itself in progress, so it isn't judged here.
  const bad = jobs.filter((j) => j.job !== "ops-check" && (j.health === "FAILED" || j.health === "STALE"));
  const to = process.env.OPS_ALERT_EMAIL || process.env.ADMIN_EMAIL;
  let alerted: string | null = null;
  if ((bad.length || errors.total) && to) {
    const base = process.env.NEXTAUTH_URL || "https://propertytiger.in";
    const html = `
      <h2 style="font-family:sans-serif">Property Tiger — ${bad.length} job issue${bad.length === 1 ? "" : "s"}, ${errors.total} server error${errors.total === 1 ? "" : "s"} in 24h</h2>
      ${bad.length ? `<ul style="font-family:sans-serif">${bad.map((j) => `<li><b>${esc(j.label)}</b>: ${j.health.toLowerCase()}${j.lastError ? ` — ${esc(j.lastError)}` : ""}${j.lastOkAt ? ` (last success ${j.lastOkAt.slice(0, 16).replace("T", " ")} UTC)` : " (never succeeded)"}</li>`).join("")}</ul>` : ""}
      ${errors.groups.length ? `<p style="font-family:sans-serif">Errors:</p><ul style="font-family:sans-serif">${errors.groups.slice(0, 10).map((g) => `<li>${g.count}× <code>${esc(g.scope)}</code>: ${esc(g.message.slice(0, 200))}</li>`).join("")}</ul>` : ""}
      <p style="font-family:sans-serif"><a href="${base}/admin/system">Open System health</a></p>`;
    const r = await sendEmail({ to, subject: `[Property Tiger] ${bad.length} job issue(s), ${errors.total} error(s)`, html, tags: { type: "ops-alert" } });
    alerted = r.ok ? (r.mocked ? "mocked (email not live)" : "sent") : `failed: ${r.error}`;
  }
  return NextResponse.json({ jobs: jobs.map((j) => ({ job: j.job, health: j.health })), issues: bad.length, errors24h: errors.total, pruned, alerted });
}

export const GET = withJobRun("ops-check", handler);
