/**
 * What each scheduled job is expected to do, and whether its record looks
 * healthy. Pure: tested in ops.test.ts. The schedules mirror vercel.json.
 */
export interface JobSpec {
  job: string;
  label: string;
  /** Expected gap between runs, hours */
  everyHours: number;
}

export const JOBS: JobSpec[] = [
  { job: "developer-records", label: "TG-RERA certificates & orders", everyHours: 24 },
  { job: "market-feeds", label: "Market feeds (guidance values, news figures)", everyHours: 24 },
  { job: "infra-crawl", label: "Infrastructure news crawler", everyHours: 24 },
  { job: "ingest-news", label: "Market Signals news", everyHours: 24 },
  { job: "osm-sync", label: "OpenStreetMap nearby places", everyHours: 24 },
  { job: "listings-daily", label: "Seller listings — daily", everyHours: 24 },
  { job: "listings-weekly", label: "Seller listings — weekly", everyHours: 24 * 7 },
  { job: "whatsapp-maintenance", label: "WhatsApp maintenance", everyHours: 24 },
  { job: "renew-gmail-watch", label: "Gmail inbound watch", everyHours: 24 },
  { job: "ops-check", label: "Health check & alerts", everyHours: 24 },
];

export type JobHealth = "OK" | "FAILED" | "STALE" | "NEVER_RAN" | "RUNNING";

export interface RunLite {
  startedAt: Date;
  finishedAt: Date | null;
  ok: boolean | null;
}

/**
 * OK       last run succeeded and is within 1.5× the schedule
 * FAILED   the most recent run failed, or never finished (killed at the time limit)
 * STALE    no successful run within 1.5× the schedule (a missed run)
 * RUNNING  started under 10 minutes ago and not finished
 * NEVER_RAN nothing recorded yet
 */
export function jobHealth(spec: JobSpec, runs: RunLite[], now = new Date()): { health: JobHealth; lastOk: Date | null; last: RunLite | null } {
  const sorted = [...runs].sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
  const last = sorted[0] ?? null;
  const lastOk = sorted.find((r) => r.ok === true)?.startedAt ?? null;
  if (!last) return { health: "NEVER_RAN", lastOk, last };
  if (last.finishedAt == null && last.ok == null) {
    // Jobs are capped at 5 minutes; one still open after 10 was killed (timeout or crash).
    if (now.getTime() - last.startedAt.getTime() < 10 * 60_000) return { health: "RUNNING", lastOk, last };
    return { health: "FAILED", lastOk, last };
  }
  if (last.ok === false) return { health: "FAILED", lastOk, last };
  const limit = spec.everyHours * 1.5 * 3_600_000;
  if (!lastOk || now.getTime() - lastOk.getTime() > limit) return { health: "STALE", lastOk, last };
  return { health: "OK", lastOk, last };
}
