/**
 * Batch village resolution (AGENTS.md geo spec, Part 3.3).
 *
 * Deduplicates identical (rawName, rawDistrict, rawMandal) tuples before
 * resolving so the queue records occurrences instead of duplicate rows — a
 * queue sorted by occurrences lets a reviewer fix the highest-impact names
 * first. Processes in batches and reports counts by status and method.
 */

import type { MatchMethod } from '@prisma/client';
import { resolveVillage, type ResolveInput, type ResolveResult, type ResolveOptions } from './resolver';

const BATCH_SIZE = 500;

export interface BatchResult {
  total: number;
  unique: number;
  byStatus: Record<ResolveResult['status'], number>;
  byMethod: Partial<Record<MatchMethod, number>>;
  durationMs: number;
}

export interface BatchOptions extends ResolveOptions {
  onProgress?: (done: number, total: number) => void;
}

function dedupeKey(r: ResolveInput): string {
  return [r.rawName, r.rawDistrict ?? '', r.rawMandal ?? ''].join('');
}

export async function batchResolve(
  source: string,
  records: ResolveInput[],
  options: BatchOptions = {},
): Promise<BatchResult> {
  const start = Date.now();
  const { onProgress, ...resolveOpts } = options;

  // Deduplicate identical tuples, carrying the occurrence count so the resolver
  // can weight the queue row in one write instead of re-resolving duplicates.
  const groups = new Map<string, { input: ResolveInput; count: number }>();
  for (const raw of records) {
    const input: ResolveInput = { ...raw, source };
    const key = dedupeKey(input);
    const g = groups.get(key);
    if (g) g.count++;
    else groups.set(key, { input, count: 1 });
  }

  const uniqueGroups = [...groups.values()];
  const byStatus: BatchResult['byStatus'] = { RESOLVED: 0, QUEUED: 0, NO_MATCH: 0 };
  const byMethod: BatchResult['byMethod'] = {};

  let done = 0;
  for (let i = 0; i < uniqueGroups.length; i += BATCH_SIZE) {
    const slice = uniqueGroups.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      slice.map(({ input, count }) =>
        resolveVillage(input, { ...resolveOpts, occurrences: count }),
      ),
    );

    for (const res of results) {
      byStatus[res.status]++;
      byMethod[res.method] = (byMethod[res.method] ?? 0) + 1;
    }

    done += slice.length;
    onProgress?.(done, uniqueGroups.length);
  }

  return {
    total: records.length,
    unique: uniqueGroups.length,
    byStatus,
    byMethod,
    durationMs: Date.now() - start,
  };
}
