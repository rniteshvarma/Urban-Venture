/** Loads job and error status for /admin/system, the daily ops check and /api/health. */
import prisma from "../prisma";
import { JOBS, jobHealth, type JobHealth } from "./schedule";

export interface JobStatus {
  job: string;
  label: string;
  everyHours: number;
  health: JobHealth;
  lastStartedAt: string | null;
  lastOkAt: string | null;
  lastStatus: number | null;
  lastError: string | null;
  lastMs: number | null;
}

export async function jobStatuses(now = new Date()): Promise<JobStatus[]> {
  const since = new Date(now.getTime() - 14 * 86_400_000);
  const runs = await prisma.jobRun.findMany({ where: { startedAt: { gte: since } }, orderBy: { startedAt: "desc" } });
  return JOBS.map((spec) => {
    const mine = runs.filter((r) => r.job === spec.job);
    const { health, lastOk, last } = jobHealth(spec, mine, now);
    const lastRow = last ? mine[0] : null;
    return {
      job: spec.job,
      label: spec.label,
      everyHours: spec.everyHours,
      health,
      lastStartedAt: lastRow?.startedAt.toISOString() ?? null,
      lastOkAt: lastOk?.toISOString() ?? null,
      lastStatus: lastRow?.status ?? null,
      lastError: lastRow?.error ?? null,
      lastMs: (lastRow?.summary as { ms?: number } | null)?.ms ?? null,
    };
  });
}

export async function recentErrors(hours = 24, take = 50) {
  const since = new Date(Date.now() - hours * 3_600_000);
  const [rows, total] = await Promise.all([
    prisma.appError.findMany({ where: { at: { gte: since } }, orderBy: { at: "desc" }, take }),
    prisma.appError.count({ where: { at: { gte: since } } }),
  ]);
  // Group repeats of the same error so one noisy bug doesn't bury the rest.
  const groups = new Map<string, { scope: string; message: string; count: number; lastAt: Date; path: string | null }>();
  for (const r of rows) {
    const k = `${r.scope}|${r.message}`;
    const g = groups.get(k);
    if (g) g.count++;
    else groups.set(k, { scope: r.scope, message: r.message, count: 1, lastAt: r.at, path: r.path });
  }
  return { total, groups: [...groups.values()] };
}

/** Drop old monitoring rows (job runs after 90 days, errors after 30) and expired rate-limit counters. */
export async function pruneOps(now = new Date()) {
  const [runs, errors, limits] = await Promise.all([
    prisma.jobRun.deleteMany({ where: { startedAt: { lt: new Date(now.getTime() - 90 * 86_400_000) } } }),
    prisma.appError.deleteMany({ where: { at: { lt: new Date(now.getTime() - 30 * 86_400_000) } } }),
    prisma.rateLimit.deleteMany({ where: { resetAt: { lt: now } } }),
  ]);
  return { runs: runs.count, errors: errors.count, rateLimits: limits.count };
}
