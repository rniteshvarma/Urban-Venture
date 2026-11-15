/**
 * Scores every public listing (Property Tiger Score, src/lib/score).
 *   npx tsx scripts/score/compute.ts
 * Runs in the Vercel build after the inventory, developer and market steps.
 */
import prisma from "../../src/lib/prisma";
import { scoreAllListings } from "../../src/lib/score/compute";

scoreAllListings({ log: console.log })
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    // A scoring problem must not block a deploy; the previous scores stay in place.
    console.error("[score] failed:", e instanceof Error ? e.message : e);
    await prisma.$disconnect();
  });
