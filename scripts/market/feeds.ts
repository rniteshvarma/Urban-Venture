/**
 * Run the market data feeds, then recompute every corridor.
 *
 *   npm run market:feeds                          # whatever is due
 *   npm run market:feeds -- --force               # refetch everything
 *   npm run market:feeds -- --only=registration   # registration | magicbricks | news (comma-separated)
 */
import prisma from "../../src/lib/prisma";
import { runMarketFeeds } from "../../src/lib/market/feeds/run";
import { computeAllCorridorScores } from "../../src/lib/corridor-intelligence";

async function main() {
  const only = process.argv.find((a) => a.startsWith("--only="))?.slice(7).split(",") as ("registration" | "magicbricks" | "news")[] | undefined;
  const s = await runMarketFeeds({ force: process.argv.includes("--force"), only, log: console.log });
  console.log("[market] feeds:", JSON.stringify({ registration: s.registration, magicbricks: s.magicbricks, news: s.news }));
  if (s.errors.length) console.log("[market] errors:\n  " + s.errors.join("\n  "));
  await computeAllCorridorScores({ skipAI: true });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
