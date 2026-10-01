/**
 * Rescore every corridor with the dynamic infra formula and print before → after.
 * Run once after deploying (the old static formula saturated at 25), or any time.
 *   npm run infra:rescore
 */
import prisma from '../../src/lib/prisma';
import { computeAllCorridorScores } from '../../src/lib/corridor-intelligence';

async function main() {
  const before = await prisma.corridorProfile.findMany({ select: { slug: true, infraScore: true, overallScore: true }, orderBy: { slug: 'asc' } });
  await computeAllCorridorScores();
  const after = new Map((await prisma.corridorProfile.findMany({ select: { slug: true, infraScore: true, overallScore: true } })).map((c) => [c.slug, c]));
  console.log('corridor'.padEnd(26), 'infra', '      overall');
  for (const b of before) {
    const a = after.get(b.slug)!;
    console.log(b.slug.padEnd(26), `${b.infraScore ?? '-'} → ${a.infraScore}`.padEnd(11), `${b.overallScore ?? '-'} → ${a.overallScore}`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
