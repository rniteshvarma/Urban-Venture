/**
 * Snapshot the corridor reference data (corridor profiles and the market
 * intelligence attached to them) from the current database into
 * prisma/data/corridor-reference.json, which seed-corridors.ts loads in every
 * Vercel build.
 *
 *   npx tsx --env-file=.env.local scripts/reference/export-corridors.ts
 *
 * Re-run after curating corridor data locally, then commit the JSON.
 */
import fs from "node:fs";
import path from "node:path";
import prisma from "../../src/lib/prisma";

const OUT = path.join(process.cwd(), "prisma/data/corridor-reference.json");

async function main() {
  const byId = { orderBy: { id: "asc" as const } };
  const snapshot = {
    corridorProfile: await prisma.corridorProfile.findMany({ orderBy: { slug: "asc" } }),
    infraProject: await prisma.infraProject.findMany(byId),
    infraMilestone: await prisma.infraMilestone.findMany(byId),
    appreciationHistory: await prisma.appreciationHistory.findMany(byId),
    demandTrend: await prisma.demandTrend.findMany(byId),
    approvalRecord: await prisma.approvalRecord.findMany(byId),
    legalRisk: await prisma.legalRisk.findMany(byId),
    marketPulse: await prisma.marketPulse.findMany(byId),
    // Implicit many-to-many: A = CorridorProfile.id, B = InfraProject.id (alphabetical model order).
    corridorInfraLinks: (
      await prisma.$queryRaw<{ A: string; B: string }[]>`SELECT "A", "B" FROM "_CorridorProfileToInfraProject" ORDER BY "A", "B"`
    ).map((l) => ({ corridorId: l.A, infraProjectId: l.B })),
  };
  fs.writeFileSync(OUT, JSON.stringify(snapshot, null, 1) + "\n");
  console.log(Object.entries(snapshot).map(([k, v]) => `${k} ${v.length}`).join(", "));
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
