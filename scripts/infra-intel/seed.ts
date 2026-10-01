/**
 * Seed live infra intelligence: sources, default auto-apply policy, corridor
 * centroids and approximate geometry for the hand-entered InfraProjects.
 * Idempotent — never overwrites learned trust, admin toggles, or values an
 * admin has already filled in.
 *
 *   npm run infra:seed
 */
import prisma from '../../src/lib/prisma';
import { SOURCE_SEEDS, TIER_TRUST } from '../../src/lib/infra-intel/sources';
import { defaultThreshold, policyKey, type SourceTier } from '../../src/lib/infra-intel/policy';
import { classifyZone } from '../../src/lib/infra-intel/geo';
import { computeImpact } from '../../src/lib/infra-intel/scoring';
import type { EventType } from '../../src/lib/infra-intel/text';

// Approximate corridor centres (locality centroids).
const CORRIDOR_CENTROIDS: Record<string, [number, number]> = {
  'tukkuguda-shamshabad': [17.227, 78.442],
  'kadthal-fcda': [16.986, 78.493],
  shadnagar: [17.071, 78.205],
  'sangareddy-industrial': [17.6246, 78.087],
  adibatla: [17.231, 78.553],
  'medchal-dundigal': [17.615, 78.443],
  'bibinagar-bhongir': [17.49, 78.84],
  'kokapet-neopolis': [17.392, 78.335],
  'maheshwaram-pharma-city': [17.1, 78.5],
  'shankarpally-mokila': [17.451, 78.17],
  'kompally-bachupally': [17.54, 78.425],
  'ghatkesar-peerzadiguda': [17.425, 78.643],
};

// Approximate geometry for the hand-entered projects, keyed by a name fragment.
const GEOMETRY: { match: RegExp; point?: [number, number]; route?: [number, number][] }[] = [
  { match: /RRR.*Northern/i, route: [[17.6246, 78.087], [17.7389, 78.2847], [17.844, 78.479], [17.845, 78.682], [17.829, 78.762], [17.5116, 78.8889], [17.251, 78.898]] },
  { match: /RRR.*Southern/i, route: [[17.251, 78.898], [17.05, 78.8], [16.849, 78.53], [17.071, 78.205], [17.311, 78.137], [17.455, 78.13], [17.6246, 78.087]] },
  { match: /Metro Phase 2A/i, route: [[17.428, 78.382], [17.415, 78.34], [17.386, 78.357], [17.32, 78.4], [17.253, 78.4], [17.2403, 78.4294]] },
  { match: /Metro Phase 2B/i, route: [[17.374, 78.562], [17.347, 78.552], [17.316, 78.488], [17.33, 78.428], [17.2403, 78.4294]] },
  { match: /Pharma City/i, point: [17.013, 78.619] },
  { match: /ORR Exit 12/i, point: [17.231, 78.553] },
  { match: /Musi Riverfront/i, route: [[17.386, 78.357], [17.37, 78.427], [17.37, 78.48], [17.39, 78.517], [17.374, 78.562], [17.37, 78.62]] },
  { match: /MMTS/i, route: [[17.629, 78.481], [17.47, 78.48], [17.4399, 78.4983], [17.465, 78.56], [17.462, 78.59], [17.45, 78.685]] },
  { match: /Neopolis/i, point: [17.392, 78.335] },
];

const EVENTS: EventType[] = ['NEW_PROJECT', 'STATUS_CHANGE', 'PROGRESS_UPDATE', 'TENDER', 'BUDGET', 'LAND_ACQUISITION', 'DELAY', 'COMPLETION', 'MILESTONE', 'OTHER'];
const TIERS: SourceTier[] = ['OFFICIAL', 'NEWS', 'AGGREGATOR'];

async function main() {
  let created = 0;
  for (const s of SOURCE_SEEDS) {
    const existing = await prisma.infraSource.findUnique({ where: { key: s.key } });
    if (existing) {
      // Refresh definition, keep learned trust / counters / admin toggle.
      await prisma.infraSource.update({ where: { key: s.key }, data: { name: s.name, kind: s.kind, tier: s.tier, url: s.url, cadenceHours: s.cadenceHours, focus: s.focus, config: s.config ?? undefined } });
    } else {
      await prisma.infraSource.create({ data: { key: s.key, name: s.name, kind: s.kind, tier: s.tier, url: s.url, cadenceHours: s.cadenceHours, focus: s.focus, config: s.config ?? undefined, trust: TIER_TRUST[s.tier] } });
      created++;
    }
  }
  console.log(`sources: ${SOURCE_SEEDS.length} (${created} new)`);

  let policies = 0;
  for (const e of EVENTS) {
    for (const t of TIERS) {
      const key = policyKey(e, t);
      const exists = await prisma.infraDecisionPolicy.findUnique({ where: { key } });
      if (!exists) {
        await prisma.infraDecisionPolicy.create({ data: { key, threshold: defaultThreshold(e, t) } });
        policies++;
      }
    }
  }
  console.log(`policy rows created: ${policies}`);

  let centroids = 0;
  for (const [slug, [lat, lng]] of Object.entries(CORRIDOR_CENTROIDS)) {
    const c = await prisma.corridorProfile.findUnique({ where: { slug }, select: { centroidLat: true } });
    if (c && c.centroidLat === null) {
      await prisma.corridorProfile.update({ where: { slug }, data: { centroidLat: lat, centroidLng: lng } });
      centroids++;
    }
  }
  console.log(`corridor centroids filled: ${centroids}`);

  const projects = await prisma.infraProject.findMany();
  let geo = 0;
  for (const p of projects) {
    const g = GEOMETRY.find((x) => x.match.test(p.name));
    const data: Record<string, unknown> = {};
    if (g && p.latitude === null && p.coordinates === null) {
      const pts = g.route ?? (g.point ? [g.point] : []);
      const lat = pts.reduce((s, q) => s + q[0], 0) / pts.length;
      const lng = pts.reduce((s, q) => s + q[1], 0) / pts.length;
      Object.assign(data, { latitude: lat, longitude: lng, ...(g.route ? { coordinates: g.route } : {}) });
      geo++;
    }
    if (p.computedImpact === null) data.computedImpact = computeImpact(p);
    // Hand-entered projects keep the admin's impact score.
    if (!p.autoCreated && !p.impactOverridden) data.impactOverridden = true;
    const lat = (data.latitude as number | undefined) ?? p.latitude;
    const lng = (data.longitude as number | undefined) ?? p.longitude;
    if (p.focusZone === null && lat != null && lng != null) data.focusZone = classifyZone(lat, lng);
    if (Object.keys(data).length) await prisma.infraProject.update({ where: { id: p.id }, data });
  }
  console.log(`project geometry filled: ${geo}/${projects.length}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
