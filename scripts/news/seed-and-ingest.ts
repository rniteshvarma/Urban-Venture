/**
 * Seed news cities and run a mock ingest across all active cities.
 *   npm run news:seed
 */
import prisma from '../../src/lib/prisma';
import { seedCities } from '../../src/lib/news/seed-cities';
import { ingestAllCities } from '../../src/lib/news/ingest';

async function main() {
  const cityCount = await seedCities();
  console.log(`✓ ${cityCount} news cities seeded`);

  const runs = await ingestAllCities();
  for (const r of runs) {
    console.log(`  ${r.cityScope.padEnd(22)} ${r.status.padEnd(8)} fetched=${r.fetched} stored=${r.stored} dupes=${r.duplicates} filtered=${r.filteredOut}${r.errorSummary ? ' err=' + r.errorSummary : ''}`);
  }
  const total = await prisma.newsArticle.count({ where: { suppressedAt: null } });
  const suppressed = await prisma.newsArticle.count({ where: { suppressedAt: { not: null } } });
  console.log(`\n✓ ${total} live articles, ${suppressed} suppressed (should never surface).\n`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('✖ news seed failed:', e instanceof Error ? e.message : e);
  await prisma.$disconnect();
  process.exit(1);
});
