/**
 * One-off, safe to re-run: tag existing listings with buyer-fit fields
 * (listing types from their free-text property type, suggested personas) and
 * create PersonaConfig rows for any new personas. Only fills EMPTY fields —
 * anything an admin already set is left alone.
 *
 *   npm run concierge:backfill            # dry run: prints what would change
 *   npm run concierge:backfill -- --apply # writes
 */
import prisma from "../../src/lib/prisma";
import { withFitDefaults } from "../../src/lib/listing-fit";
import { ensurePersonaConfigs } from "../../src/lib/persona-config";

const apply = process.argv.includes("--apply");

async function main() {
  const projects = await prisma.project.findMany({
    select: { id: true, name: true, propertyType: true, listingTypes: true, purposes: true, targetPersonas: true, minBudgetLakhs: true, maxBudgetLakhs: true, riskLevel: true },
  });
  let changed = 0;
  for (const p of projects) {
    const patch = withFitDefaults<{ listingTypes?: typeof p.listingTypes; targetPersonas?: typeof p.targetPersonas }>({}, p);
    const updates: Record<string, unknown> = {};
    if (patch.listingTypes && !p.listingTypes.length) updates.listingTypes = patch.listingTypes;
    if (patch.targetPersonas && !p.targetPersonas.length) updates.targetPersonas = patch.targetPersonas;
    if (!Object.keys(updates).length) continue;
    changed++;
    console.log(`${apply ? "✓" : "·"} ${p.name} (${p.propertyType}) →`, JSON.stringify(updates));
    if (apply) await prisma.project.update({ where: { id: p.id }, data: updates });
  }
  const created = apply ? await ensurePersonaConfigs() : 0;
  console.log(`\n${changed} of ${projects.length} listings ${apply ? "updated" : "would change"}${apply ? ` · ${created} persona config(s) created` : " — re-run with --apply to write"}.`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
