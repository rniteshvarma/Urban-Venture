/**
 * Village resolver — reduces an inconsistently-spelled source place-name to a
 * canonical RevenueVillage (AGENTS.md geo spec, Part 3.2).
 *
 * Resolution ladder, stop at first success:
 *   Tier 0  Alias cache            (source, rawName, rawDistrict, rawMandal)
 *   Tier 1  Explicit LGD code
 *   Tier 2  Geometry               PostGIS point-in-polygon
 *   Tier 3  Blocking               reduce candidate set by mandal/district
 *   Tier 4  Composite scoring      weighted string + phonetic + translit
 *   Tier 5  Decision               auto-accept / queue, with the ambiguity rule
 *
 * NEVER guess: anything that doesn't clear the bar is routed to ResolutionQueue
 * and excluded from downstream use until a human resolves it.
 */

import type { MatchMethod, District, Mandal } from '@prisma/client';
import prisma from '../prisma';
import { normalise, phoneticKey, teluguToItrans } from './normalise';
import { jaroWinkler, tokenSetRatio } from './similarity';

export const RESOLVER_VERSION = '1.0.0';

// Decision thresholds (spec Tier 5).
const ACCEPT_SCORE = 0.95;
const QUEUE_FLOOR = 0.8;
const MIN_MARGIN = 0.08; // top must beat second by this much
const NO_MANDAL_CONF_CAP = 0.85; // cap when neither district nor mandal resolved
const ADMIN_MATCH_THRESHOLD = 0.86; // district/mandal fuzzy-resolution threshold

export interface ResolveInput {
  source: string;
  rawName: string;
  rawDistrict?: string | null;
  rawMandal?: string | null;
  lgdCode?: string | null;
  lat?: number | null;
  lng?: number | null;
  asOfDate?: Date; // for historical records (reserved — see resolveDistrict TODO)
  rawPayload?: unknown;
}

export interface Candidate {
  villageId: string;
  lgdCode: string;
  name: string;
  mandalName: string;
  districtName?: string;
  score: number;
  method: MatchMethod;
}

export interface ResolveResult {
  status: 'RESOLVED' | 'QUEUED' | 'NO_MATCH';
  villageId?: string;
  lgdCode?: string;
  confidence: number;
  method: MatchMethod;
  candidates?: Candidate[];
}

export interface ResolveOptions {
  /** Tier 0 alias cache. Disable for the accuracy harness (spec Part 5). */
  useAliasCache?: boolean;
  /** Persist side-effects: write VillageAlias on accept, upsert ResolutionQueue. */
  persist?: boolean;
  /** How many source occurrences this call represents (batch dedupe weight). */
  occurrences?: number;
}

const DEFAULT_OPTS: Required<ResolveOptions> = { useAliasCache: true, persist: true, occurrences: 1 };

let geometryTierWarned = false;

/** Detect Telugu script so we can transliterate before normalising. */
function isTelugu(s: string): boolean {
  return /[ఀ-౿]/.test(s);
}

/** Normalised English form + its phonetic key for a (possibly Telugu) raw name. */
function prepareInput(rawName: string): { canonical: string; original: string; phonetic: string } {
  const working = isTelugu(rawName) ? teluguToItrans(rawName) : rawName;
  const n = normalise(working);
  return {
    canonical: n.canonical,
    original: rawName.trim().toLowerCase(),
    phonetic: phoneticKey(n.canonical),
  };
}

// ── Tier 0: alias cache ──────────────────────────────────────────────────────

async function lookupAlias(input: ResolveInput) {
  return prisma.villageAlias.findFirst({
    where: {
      source: input.source,
      rawName: input.rawName,
      rawDistrict: input.rawDistrict ?? null,
      rawMandal: input.rawMandal ?? null,
    },
    include: { village: true },
  });
}

// ── Tier 3 helpers: resolve raw district / mandal to canonical rows ──────────
// NOTE(asOfDate): historical resolution through AdminBoundaryHistory is not yet
// wired — getAdminContext() lands with the boundary-history loader. Until then
// we resolve against the current District/Mandal tables regardless of asOfDate.

async function resolveDistrict(rawDistrict?: string | null): Promise<District | null> {
  if (!rawDistrict?.trim()) return null;
  const target = normalise(rawDistrict).canonical;
  const districts = await prisma.district.findMany({ where: { supersededOn: null } });
  return bestFuzzy(districts, target, (d) => d.name);
}

async function resolveMandal(
  rawMandal: string | null | undefined,
  districtId?: string,
): Promise<Mandal | null> {
  if (!rawMandal?.trim()) return null;
  const target = normalise(rawMandal).canonical;
  const mandals = await prisma.mandal.findMany({
    where: { supersededOn: null, ...(districtId ? { districtId } : {}) },
  });
  return bestFuzzy(mandals, target, (m) => m.name);
}

function bestFuzzy<T>(rows: T[], target: string, nameOf: (r: T) => string): T | null {
  let best: T | null = null;
  let bestScore = 0;
  for (const row of rows) {
    const score = jaroWinkler(target, normalise(nameOf(row)).canonical);
    if (score > bestScore) {
      bestScore = score;
      best = row;
    }
  }
  return bestScore >= ADMIN_MATCH_THRESHOLD ? best : null;
}

// ── Tier 4: composite scoring ────────────────────────────────────────────────

interface VillageRow {
  id: string;
  lgdCode: string;
  name: string;
  nameNormalised: string;
  namePhonetic: string;
  nameTranslit: string | null;
  mandal: { name: string; district: { name: string } };
}

function scoreCandidate(
  prepared: ReturnType<typeof prepareInput>,
  village: VillageRow,
  mandalAgreement: number,
): number {
  const stringScore = jaroWinkler(prepared.canonical, village.nameNormalised);
  const phoneticMatch = prepared.phonetic && prepared.phonetic === village.namePhonetic ? 1 : 0;
  const tokenScore = tokenSetRatio(prepared.canonical, normalise(village.name).canonical);
  const translitMatch =
    village.nameTranslit && prepared.phonetic === village.nameTranslit ? 1 : 0;

  return (
    0.4 * stringScore +
    0.25 * phoneticMatch +
    0.15 * tokenScore +
    0.1 * translitMatch +
    0.1 * mandalAgreement
  );
}

// ── Tier 2: geometry ─────────────────────────────────────────────────────────

async function resolveByGeometry(lat: number, lng: number): Promise<{ id: string; lgdCode: string } | null> {
  try {
    const rows = await prisma.$queryRaw<Array<{ id: string; lgdCode: string }>>`
      SELECT id, "lgdCode"
      FROM "RevenueVillage"
      WHERE boundary IS NOT NULL
        AND ST_Contains(boundary, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326))
      LIMIT 1`;
    return rows[0] ?? null;
  } catch (err) {
    if (!geometryTierWarned) {
      geometryTierWarned = true;
      console.warn(
        '[geo/resolver] geometry tier unavailable (PostGIS / boundary column missing); skipping. ',
        (err as Error).message,
      );
    }
    return null;
  }
}

// ── Persistence ──────────────────────────────────────────────────────────────

async function writeAlias(
  input: ResolveInput,
  villageId: string,
  method: MatchMethod,
  confidence: number,
): Promise<void> {
  const existing = await lookupAlias(input);
  if (existing) return; // already cached
  await prisma.villageAlias.create({
    data: {
      villageId,
      source: input.source,
      rawName: input.rawName,
      rawDistrict: input.rawDistrict ?? null,
      rawMandal: input.rawMandal ?? null,
      matchMethod: method,
      confidence,
      sourceIdent: input.lgdCode ?? null,
    },
  });
}

async function upsertQueue(
  input: ResolveInput,
  candidates: Candidate[],
  topScore: number | null,
  occurrences: number,
): Promise<void> {
  // Composite unique contains nullable columns, so NULLs would defeat a Prisma
  // upsert — find-then-update/create manually and bump occurrences.
  const existing = await prisma.resolutionQueue.findFirst({
    where: {
      source: input.source,
      rawName: input.rawName,
      rawDistrict: input.rawDistrict ?? null,
      rawMandal: input.rawMandal ?? null,
      status: 'PENDING',
    },
  });
  if (existing) {
    await prisma.resolutionQueue.update({
      where: { id: existing.id },
      data: { occurrences: { increment: occurrences }, candidates: candidates as unknown as object, topScore },
    });
    return;
  }
  await prisma.resolutionQueue.create({
    data: {
      source: input.source,
      rawName: input.rawName,
      rawDistrict: input.rawDistrict ?? null,
      rawMandal: input.rawMandal ?? null,
      rawPayload: (input.rawPayload ?? {}) as object,
      candidates: candidates as unknown as object,
      topScore,
      status: topScore === null ? 'NO_MATCH' : 'PENDING',
      occurrences,
    },
  });
}

// ── Main entry ───────────────────────────────────────────────────────────────

export async function resolveVillage(
  input: ResolveInput,
  options: ResolveOptions = {},
): Promise<ResolveResult> {
  const opts = { ...DEFAULT_OPTS, ...options };

  // Tier 0 — alias cache (hot path).
  if (opts.useAliasCache) {
    const alias = await lookupAlias(input);
    if (alias) {
      return {
        status: 'RESOLVED',
        villageId: alias.villageId,
        lgdCode: alias.village.lgdCode,
        confidence: 1,
        method: alias.matchMethod,
      };
    }
  }

  // Tier 1 — explicit LGD code.
  if (input.lgdCode?.trim()) {
    const v = await prisma.revenueVillage.findUnique({ where: { lgdCode: input.lgdCode.trim() } });
    if (v) {
      if (opts.persist) await writeAlias(input, v.id, 'EXACT_LGD', 1);
      return { status: 'RESOLVED', villageId: v.id, lgdCode: v.lgdCode, confidence: 1, method: 'EXACT_LGD' };
    }
  }

  // Tier 2 — geometry.
  if (typeof input.lat === 'number' && typeof input.lng === 'number') {
    const hit = await resolveByGeometry(input.lat, input.lng);
    if (hit) {
      if (opts.persist) await writeAlias(input, hit.id, 'GEOMETRY', 0.98);
      return { status: 'RESOLVED', villageId: hit.id, lgdCode: hit.lgdCode, confidence: 0.98, method: 'GEOMETRY' };
    }
  }

  // Tier 3 — blocking.
  const prepared = prepareInput(input.rawName);
  const district = await resolveDistrict(input.rawDistrict);
  const mandal = await resolveMandal(input.rawMandal, district?.id);

  let villages: VillageRow[];
  let mandalAgreement: number;
  let confidenceCapped = false;

  const select = {
    id: true,
    lgdCode: true,
    name: true,
    nameNormalised: true,
    namePhonetic: true,
    nameTranslit: true,
    mandal: { select: { name: true, district: { select: { name: true } } } },
  } as const;

  if (mandal) {
    villages = (await prisma.revenueVillage.findMany({ where: { mandalId: mandal.id, isActive: true }, select })) as VillageRow[];
    mandalAgreement = 1;
  } else if (district) {
    villages = (await prisma.revenueVillage.findMany({ where: { mandal: { districtId: district.id }, isActive: true }, select })) as VillageRow[];
    mandalAgreement = 0.5;
  } else {
    // No admin context: block on phonetic key or normalised prefix (indexed),
    // and cap confidence regardless of string score (spec Tier 3).
    const prefix = prepared.canonical.slice(0, 3);
    villages = (await prisma.revenueVillage.findMany({
      where: {
        isActive: true,
        OR: [
          { namePhonetic: prepared.phonetic },
          ...(prefix ? [{ nameNormalised: { startsWith: prefix } }] : []),
        ],
      },
      select,
      take: 500,
    })) as VillageRow[];
    mandalAgreement = 0;
    confidenceCapped = true;
  }

  if (villages.length === 0) {
    if (opts.persist) await upsertQueue(input, [], null, opts.occurrences);
    return { status: 'NO_MATCH', confidence: 0, method: 'FUZZY_HIGH', candidates: [] };
  }

  // Tier 4 — score every candidate.
  const scored: Candidate[] = villages
    .map((v) => ({
      villageId: v.id,
      lgdCode: v.lgdCode,
      name: v.name,
      mandalName: v.mandal.name,
      districtName: v.mandal.district.name,
      score: scoreCandidate(prepared, v, mandalAgreement),
      method: 'FUZZY_HIGH' as MatchMethod,
    }))
    .sort((a, b) => b.score - a.score);

  const top = scored[0];
  const secondScore = scored[1]?.score ?? 0;
  const margin = top.score - secondScore;
  const mandalAgreed = mandalAgreement === 1;
  const topCandidates = scored.slice(0, 5);

  // Tier 5 — decision. Ambiguity rule first: near-tie always queues, even at 0.99.
  const accept =
    margin >= MIN_MARGIN && top.score >= ACCEPT_SCORE && mandalAgreed && !confidenceCapped;

  if (accept) {
    if (opts.persist) await writeAlias(input, top.villageId, 'FUZZY_HIGH', top.score);
    return {
      status: 'RESOLVED',
      villageId: top.villageId,
      lgdCode: top.lgdCode,
      confidence: top.score,
      method: 'FUZZY_HIGH',
      candidates: topCandidates,
    };
  }

  // Everything else is queued for human review — never guessed.
  if (opts.persist) await upsertQueue(input, topCandidates, top.score, opts.occurrences);
  const cappedConfidence = confidenceCapped ? Math.min(top.score, NO_MANDAL_CONF_CAP) : top.score;
  return {
    status: 'QUEUED',
    confidence: cappedConfidence,
    method: 'FUZZY_HIGH',
    candidates: topCandidates,
  };
}
