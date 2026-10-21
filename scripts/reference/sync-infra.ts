/**
 * Loads the source-checked infrastructure list (prisma/data/infra-verified.json),
 * withdraws the projects of the original synthetic seed batch, and applies the
 * rewritten corridor descriptions and buyer checks (prisma/data/reference-text.json).
 *
 *   npx tsx --env-file=.env.local scripts/reference/sync-infra.ts [--dry-run]
 *
 * Runs in every Vercel build after seed-corridors.ts. Idempotent:
 *  - each verified project is upserted by its fixed id, its milestones are
 *    replaced, and it is linked to the corridors it lists. A project the infra
 *    crawler has updated since `verifiedAt` keeps the crawler's status and
 *    dates (they're newer); only its sources and links are refreshed.
 *  - the ten projects inserted in the 2026-08-16 seed batch carried government
 *    order numbers, tender references, investment, job and impact figures that
 *    trace to no source. They are unpublished (kept for the audit trail), their
 *    invented references are cleared and their milestones deleted.
 */
import fs from "node:fs";
import path from "node:path";
import { Prisma, type InfraCategory, type InfraStatus, type MilestoneStatus } from "@prisma/client";
import prisma from "../../src/lib/prisma";

const DATA = path.join(process.cwd(), "prisma/data/infra-verified.json");
const TEXT = path.join(process.cwd(), "prisma/data/reference-text.json");
const SYNTHETIC_SEED_BATCH = { gte: new Date("2026-08-16T04:38:00Z"), lt: new Date("2026-08-16T04:39:00Z") };
export const WITHDRAWN_NOTE = "Withdrawn 2026-10-21: original seed data could not be traced to a source";

interface VerifiedProject {
  id: string;
  name: string;
  shortName: string;
  category: InfraCategory;
  subCategory: string | null;
  description: string;
  status: InfraStatus;
  estimatedCompletion: string | null;
  totalLengthKm: number | null;
  totalInvestmentCr: number | null;
  fundingModel: string | null;
  sourceAuthority: string;
  sourceUrl: string;
  routeDescription: string;
  affectedCorridorSlugs: string[];
  impactRadiusKm: number;
  milestones: { title: string; date: string | null; status: MilestoneStatus; sourceUrl: string | null }[];
}

async function main() {
  const dry = process.argv.includes("--dry-run");
  const file: { verifiedAt: string; projects: VerifiedProject[] } = JSON.parse(fs.readFileSync(DATA, "utf8"));
  const verifiedAt = new Date(`${file.verifiedAt}T00:00:00Z`);
  const corridors = await prisma.corridorProfile.findMany({ select: { id: true, slug: true } });
  const corridorId = new Map(corridors.map((c) => [c.slug, c.id]));

  // 1. Withdraw the synthetic batch.
  const synthetic = await prisma.infraProject.findMany({
    where: { createdAt: SYNTHETIC_SEED_BATCH, autoCreated: false, NOT: { lastVerifiedSource: WITHDRAWN_NOTE } },
    select: { id: true, name: true },
  });
  if (!dry && synthetic.length) {
    const ids = synthetic.map((p) => p.id);
    await prisma.infraMilestone.deleteMany({ where: { projectId: { in: ids } } });
    for (const id of ids) {
      await prisma.infraProject.update({
        where: { id },
        data: {
          isPublished: false,
          sourceGO: null, sourceTender: null, reImpactNarrative: null, historicalAnalog: null,
          expectedJobs: null, totalInvestmentCr: null, lastVerifiedSource: WITHDRAWN_NOTE,
          corridors: { set: [] },
        },
      });
    }
  }

  // 2. Upsert the verified list.
  let created = 0, updated = 0, keptCrawler = 0;
  for (const p of file.projects) {
    const existing = await prisma.infraProject.findUnique({ where: { id: p.id }, select: { lastVerifiedDate: true, lastVerifiedSource: true } });
    const crawlerNewer = !!existing?.lastVerifiedDate && existing.lastVerifiedDate > verifiedAt && existing.lastVerifiedSource !== "Property Tiger source check";
    const facts = {
      name: p.name, shortName: p.shortName, category: p.category, subCategory: p.subCategory, description: p.description,
      totalLengthKm: p.totalLengthKm, totalInvestmentCr: p.totalInvestmentCr, fundingModel: p.fundingModel,
      sourceAuthority: p.sourceAuthority, sourceUrl: p.sourceUrl, routeDescription: p.routeDescription,
      affectedCorridorSlugs: p.affectedCorridorSlugs, impactRadiusKm: p.impactRadiusKm,
      sourceGO: null, sourceTender: null, reImpactNarrative: null, historicalAnalog: null, expectedJobs: null,
      reImpactScore: 0, computedImpact: null, impactOverridden: false, isPublished: true,
    };
    const verified = { status: p.status, estimatedCompletion: p.estimatedCompletion, lastVerifiedDate: verifiedAt, lastVerifiedSource: "Property Tiger source check" };
    const links = p.affectedCorridorSlugs.map((s) => corridorId.get(s)).filter((id): id is string => !!id).map((id) => ({ id }));
    if (dry) {
      console.log(`[infra] would ${existing ? "update" : "create"} ${p.id}${crawlerNewer ? " (keeping crawler status)" : ""}`);
      continue;
    }
    if (!existing) {
      await prisma.infraProject.create({ data: { id: p.id, ...facts, ...verified, corridors: { connect: links } } });
      created++;
    } else {
      await prisma.infraProject.update({ where: { id: p.id }, data: { ...facts, ...(crawlerNewer ? {} : verified), corridors: { set: links } } });
      if (crawlerNewer) keptCrawler++;
      else updated++;
    }
    // Milestones from the file replace the file's earlier ones; crawler-added ones (other ids) stay.
    const ids = p.milestones.map((_, i) => `${p.id}-m${i + 1}`);
    await prisma.infraMilestone.deleteMany({ where: { projectId: p.id, id: { startsWith: `${p.id}-m`, notIn: ids } } });
    for (const [i, m] of p.milestones.entries()) {
      const data = { projectId: p.id, title: m.title, date: m.date ? new Date(`${m.date}T00:00:00Z`) : null, status: m.status, sourceUrl: m.sourceUrl, description: null };
      await prisma.infraMilestone.upsert({ where: { id: ids[i] }, create: { id: ids[i], ...data }, update: data });
    }
  }

  // 3. Corridor descriptions and the buyer checks, rewritten to verifiable facts.
  const text: { corridorDescriptions: Record<string, string>; legalRisks: Record<string, Prisma.LegalRiskUpdateInput> } = JSON.parse(fs.readFileSync(TEXT, "utf8"));
  let described = 0, checks = 0;
  if (!dry) {
    for (const [slug, description] of Object.entries(text.corridorDescriptions)) {
      described += (await prisma.corridorProfile.updateMany({ where: { slug }, data: { description } })).count;
    }
    for (const [id, data] of Object.entries(text.legalRisks)) {
      checks += (await prisma.legalRisk.updateMany({ where: { id }, data: { ...(data as Prisma.LegalRiskUpdateManyMutationInput), affectedZones: [] } })).count;
    }
  }

  console.log(
    `[reference] ${described} corridor descriptions, ${checks} buyer checks refreshed`,
  );
  console.log(
    `[infra] verified list: ${created} created, ${updated} updated, ${keptCrawler} kept crawler status | withdrew ${dry ? "(dry run) " : ""}${synthetic.length} unsourced seed projects${synthetic.length ? `: ${synthetic.map((s) => s.name).join("; ")}` : ""}`,
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e instanceof Prisma.PrismaClientKnownRequestError ? `${e.code} ${e.message}` : e);
    await prisma.$disconnect();
    process.exit(1);
  });
