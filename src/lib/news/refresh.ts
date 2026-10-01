/**
 * On-demand "live" refresh, triggered when a reader opens or refreshes /news.
 *
 * Politeness + cost guard: a city is re-fetched at most once per
 * MIN_INTERVAL_SEC no matter how many readers arrive, and a run already in
 * flight (NewsIngestRun RUNNING, < LOCK_SEC old) is never duplicated — later
 * callers just get the current state back. So N concurrent readers cause at
 * most one round of feed requests per city per interval.
 */
import prisma from '../prisma';
import { ingestCity } from './ingest';
import { isMockMode } from './providers';

export const MIN_INTERVAL_SEC = 120;
const LOCK_SEC = 90;

export interface RefreshResult {
  ran: boolean;
  reason?: 'fresh' | 'in-progress' | 'mock' | 'unknown-city';
  newCount: number;
  lastIngestAt: string | null;
  nextRefreshInSec: number;
  status?: string;
}

export async function refreshCityIfStale(slug: string): Promise<RefreshResult> {
  const city = await prisma.newsCity.findUnique({ where: { slug } });
  if (!city || !city.isActive) return { ran: false, reason: 'unknown-city', newCount: 0, lastIngestAt: null, nextRefreshInSec: 0 };
  const last = city.lastIngestAt?.getTime() ?? 0;
  const ageSec = (Date.now() - last) / 1000;
  const base = { lastIngestAt: city.lastIngestAt?.toISOString() ?? null };
  if (isMockMode()) return { ...base, ran: false, reason: 'mock', newCount: 0, nextRefreshInSec: 0 };
  if (ageSec < MIN_INTERVAL_SEC) {
    return { ...base, ran: false, reason: 'fresh', newCount: 0, nextRefreshInSec: Math.ceil(MIN_INTERVAL_SEC - ageSec) };
  }
  const inFlight = await prisma.newsIngestRun.findFirst({
    where: { cityScope: slug, status: 'RUNNING', startedAt: { gte: new Date(Date.now() - LOCK_SEC * 1000) } },
  });
  if (inFlight) return { ...base, ran: false, reason: 'in-progress', newCount: 0, nextRefreshInSec: 10 };

  const run = await ingestCity(slug);
  const updated = await prisma.newsCity.findUnique({ where: { slug }, select: { lastIngestAt: true } });
  return {
    ran: true,
    status: run.status,
    newCount: run.stored,
    lastIngestAt: updated?.lastIngestAt?.toISOString() ?? null,
    nextRefreshInSec: MIN_INTERVAL_SEC,
  };
}
