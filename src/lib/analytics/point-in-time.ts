/**
 * Point-in-time feature accessor (Validation Lab spec, Part 1).
 *
 * THE anti-lookahead guard. Every backtest reads features through this function
 * and never touches VillageFeature directly — that is how lookahead bias creeps
 * in. Returns, for each village, the latest value of every feature that was
 * BOTH already known and already true as of `asOfDate`:
 *
 *     knownAt    <= asOfDate   (we hadn't learned it yet after this)
 *     observedAt <= asOfDate   (it wasn't true in the world yet after this)
 *
 * "Latest" = the row with the greatest observedAt among those; ties broken by
 * the most recently known (greatest knownAt).
 */

import prisma from '../prisma';

export interface FeatureValue {
  value: number;
  observedAt: Date;
  knownAt: Date;
  source: string;
}

/** villageId -> (featureKey -> latest known-and-observed value as of the date). */
export type FeatureMatrix = Map<string, Map<string, FeatureValue>>;

export async function getFeaturesAsOf(
  villageIds: string[],
  asOfDate: Date,
): Promise<FeatureMatrix> {
  const matrix: FeatureMatrix = new Map(villageIds.map((id) => [id, new Map()]));
  if (villageIds.length === 0) return matrix;

  // Pull every candidate row (both timestamps <= asOfDate), newest-observed
  // first, then newest-known. The first row seen per (village, feature) wins.
  const rows = await prisma.villageFeature.findMany({
    where: {
      villageId: { in: villageIds },
      knownAt: { lte: asOfDate },
      observedAt: { lte: asOfDate },
    },
    orderBy: [{ observedAt: 'desc' }, { knownAt: 'desc' }],
    select: { villageId: true, featureKey: true, value: true, observedAt: true, knownAt: true, source: true },
  });

  for (const r of rows) {
    const byFeature = matrix.get(r.villageId)!;
    if (!byFeature.has(r.featureKey)) {
      byFeature.set(r.featureKey, {
        value: r.value,
        observedAt: r.observedAt,
        knownAt: r.knownAt,
        source: r.source,
      });
    }
  }

  return matrix;
}

/** Convenience: the point-in-time value of one feature for one village. */
export async function getFeatureAsOf(
  villageId: string,
  featureKey: string,
  asOfDate: Date,
): Promise<FeatureValue | null> {
  const matrix = await getFeaturesAsOf([villageId], asOfDate);
  return matrix.get(villageId)?.get(featureKey) ?? null;
}
