/**
 * Bootstrap corridor reference data from prisma/data/corridor-reference.json
 * (written by export-corridors.ts): corridor profiles, infrastructure projects
 * and milestones, appreciation history, demand trends, approval records, legal
 * risks and market pulse.
 *
 *   npx tsx --env-file=.env.local scripts/reference/seed-corridors.ts
 *
 * Runs in every Vercel build. Each table is filled only while it is EMPTY, so a
 * fresh database gets the full dataset but an existing one is never touched:
 * admin edits are kept and deliberately deleted rows are not resurrected. (The
 * older market seeds wipe users and leads first and must never run on prod.)
 */
import fs from "node:fs";
import path from "node:path";
import { Prisma } from "@prisma/client";
import prisma from "../../src/lib/prisma";

const DATA = path.join(process.cwd(), "prisma/data/corridor-reference.json");

interface Snapshot {
  corridorProfile: Prisma.CorridorProfileCreateManyInput[];
  infraProject: Prisma.InfraProjectCreateManyInput[];
  infraMilestone: Prisma.InfraMilestoneCreateManyInput[];
  appreciationHistory: Prisma.AppreciationHistoryCreateManyInput[];
  demandTrend: Prisma.DemandTrendCreateManyInput[];
  approvalRecord: Prisma.ApprovalRecordCreateManyInput[];
  legalRisk: Prisma.LegalRiskCreateManyInput[];
  marketPulse: Prisma.MarketPulseCreateManyInput[];
  corridorInfraLinks: { corridorId: string; infraProjectId: string }[];
}

const filled: string[] = [];
const kept: string[] = [];

/** Insert `rows` into a table only when it has no rows yet. */
async function fillIfEmpty(label: string, count: () => Promise<number>, insert: () => Promise<number>) {
  if ((await count()) > 0) {
    kept.push(label);
    return;
  }
  filled.push(`${label} ${await insert()}`);
}

async function main() {
  const s: Snapshot = JSON.parse(fs.readFileSync(DATA, "utf8"));

  await fillIfEmpty("corridors", () => prisma.corridorProfile.count(), async () =>
    (await prisma.corridorProfile.createMany({ data: s.corridorProfile, skipDuplicates: true })).count);
  await fillIfEmpty("infra projects", () => prisma.infraProject.count(), async () =>
    (await prisma.infraProject.createMany({
      // A JSON null has to be sent as DbNull in a bulk insert.
      data: s.infraProject.map((p) => ({ ...p, coordinates: p.coordinates ?? Prisma.DbNull })),
      skipDuplicates: true,
    })).count);

  // Children only attach to parents that exist (an admin may have removed some).
  const corridors = await prisma.corridorProfile.findMany({ select: { id: true, slug: true } });
  const slugs = new Set(corridors.map((c) => c.slug));
  const corridorIds = new Set(corridors.map((c) => c.id));
  const infraIds = new Set((await prisma.infraProject.findMany({ select: { id: true } })).map((p) => p.id));
  const onCorridor = <T extends { corridorProfileSlug?: string | null }>(rows: T[]) =>
    rows.filter((r) => !r.corridorProfileSlug || slugs.has(r.corridorProfileSlug));

  await fillIfEmpty("infra milestones", () => prisma.infraMilestone.count(), async () =>
    (await prisma.infraMilestone.createMany({ data: s.infraMilestone.filter((m) => infraIds.has(m.projectId)), skipDuplicates: true })).count);
  await fillIfEmpty("appreciation history", () => prisma.appreciationHistory.count(), async () =>
    (await prisma.appreciationHistory.createMany({ data: onCorridor(s.appreciationHistory), skipDuplicates: true })).count);
  await fillIfEmpty("demand trends", () => prisma.demandTrend.count(), async () =>
    (await prisma.demandTrend.createMany({ data: onCorridor(s.demandTrend), skipDuplicates: true })).count);
  await fillIfEmpty("approval records", () => prisma.approvalRecord.count(), async () =>
    (await prisma.approvalRecord.createMany({ data: onCorridor(s.approvalRecord), skipDuplicates: true })).count);
  await fillIfEmpty("legal risks", () => prisma.legalRisk.count(), async () =>
    (await prisma.legalRisk.createMany({ data: s.legalRisk, skipDuplicates: true })).count);
  await fillIfEmpty("market pulse", () => prisma.marketPulse.count(), async () =>
    (await prisma.marketPulse.createMany({ data: s.marketPulse, skipDuplicates: true })).count);

  await fillIfEmpty(
    "corridor↔infra links",
    async () => Number((await prisma.$queryRaw<{ n: bigint }[]>`SELECT count(*) AS n FROM "_CorridorProfileToInfraProject"`)[0].n),
    async () => {
      const links = s.corridorInfraLinks.filter((l) => corridorIds.has(l.corridorId) && infraIds.has(l.infraProjectId));
      const byCorridor = new Map<string, string[]>();
      for (const l of links) byCorridor.set(l.corridorId, [...(byCorridor.get(l.corridorId) ?? []), l.infraProjectId]);
      for (const [id, infra] of byCorridor) {
        await prisma.corridorProfile.update({ where: { id }, data: { infraProjects: { connect: infra.map((p) => ({ id: p })) } } });
      }
      return links.length;
    },
  );

  console.log(`[corridors] filled: ${filled.join(", ") || "nothing"} | already present: ${kept.join(", ") || "none"}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
