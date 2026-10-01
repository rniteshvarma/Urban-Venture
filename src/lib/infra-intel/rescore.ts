/**
 * DB glue for the dynamic corridor infra score (see scoring.ts).
 * `corridorInfraFromDb` is what computeCorridorScore() now calls; every
 * rescore also writes a CorridorScoreSnapshot so the UI can explain moves.
 */
import prisma from '../prisma';
import { corridorInfraScore, computeImpact, type CorridorInfraResult, type ProjectForScoring } from './scoring';
import { STATUS_RANK } from './text';

const DAY = 86400000;

function parseRoute(coords: unknown): [number, number][] | null {
  if (!Array.isArray(coords)) return null;
  const pts = coords.filter((c): c is [number, number] => Array.isArray(c) && c.length >= 2 && typeof c[0] === 'number' && typeof c[1] === 'number');
  return pts.length > 1 ? pts : null;
}

/** Count forward status moves per project in the last 90 days (from the bi-temporal history). */
async function upgradesSince(projectIds: string[], since: Date): Promise<Map<string, number>> {
  const rows = await prisma.infraStatusHistory.findMany({
    where: { infraProjectId: { in: projectIds } },
    orderBy: { observedAt: 'asc' },
    select: { infraProjectId: true, status: true, observedAt: true },
  });
  const out = new Map<string, number>();
  const last = new Map<string, number>();
  for (const r of rows) {
    const rank = STATUS_RANK[r.status] ?? null;
    const prev = last.get(r.infraProjectId);
    if (rank !== null) {
      if (prev !== undefined && rank > prev && r.observedAt >= since) out.set(r.infraProjectId, (out.get(r.infraProjectId) ?? 0) + 1);
      else if (prev === undefined && r.observedAt >= since && rank >= STATUS_RANK.APPROVED) out.set(r.infraProjectId, (out.get(r.infraProjectId) ?? 0) + 1);
      last.set(r.infraProjectId, rank);
    }
  }
  return out;
}

export async function loadScoringProjects(): Promise<(ProjectForScoring & { slugs: string[] })[]> {
  const projects = await prisma.infraProject.findMany({ where: { isPublished: true } });
  const ups = await upgradesSince(projects.map((p) => p.id), new Date(Date.now() - 90 * DAY));
  return projects.map((p) => ({
    id: p.id,
    name: p.name,
    status: p.status,
    category: p.category,
    impact: p.impactOverridden ? p.reImpactScore : (p.computedImpact ?? p.reImpactScore) || computeImpact(p),
    impactRadiusKm: p.impactRadiusKm || 10,
    estimatedCompletion: p.estimatedCompletion,
    latitude: p.latitude,
    longitude: p.longitude,
    route: parseRoute(p.coordinates),
    listedForCorridor: false,
    statusUpgrades90d: ups.get(p.id) ?? 0,
    lastVerifiedAt: p.lastVerifiedDate,
    slugs: p.affectedCorridorSlugs,
  }));
}

export async function corridorInfraFromDb(slug: string, preloaded?: (ProjectForScoring & { slugs: string[] })[]): Promise<CorridorInfraResult> {
  const corridor = await prisma.corridorProfile.findUnique({ where: { slug }, select: { centroidLat: true, centroidLng: true } });
  const projects = (preloaded ?? (await loadScoringProjects())).map((p) => ({ ...p, listedForCorridor: p.slugs.includes(slug) }));
  return corridorInfraScore(projects, { lat: corridor?.centroidLat ?? null, lng: corridor?.centroidLng ?? null });
}

export async function snapshotCorridor(slug: string, result: CorridorInfraResult, overallScore: number | null): Promise<void> {
  await prisma.corridorScoreSnapshot.create({
    data: { corridorSlug: slug, infraScore: result.infraScore, overallScore, drivers: result.drivers as unknown as object },
  });
}

/** Latest two snapshots → "moved +4 because …" for a corridor. */
export async function scoreMovement(slug: string) {
  const [latest, previous] = await prisma.corridorScoreSnapshot.findMany({ where: { corridorSlug: slug }, orderBy: { computedAt: 'desc' }, take: 2 });
  if (!latest) return null;
  return {
    infraScore: latest.infraScore,
    delta: previous ? latest.infraScore - previous.infraScore : null,
    computedAt: latest.computedAt,
    drivers: latest.drivers as unknown as CorridorInfraResult['drivers'],
  };
}
