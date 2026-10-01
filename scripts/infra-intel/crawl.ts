/**
 * Run one full infra crawl locally (all due sources, then finalize) and print
 * the summary. Same code path as the daily cron.
 *
 *   npm run infra:crawl            # due sources only (cron behaviour)
 *   npm run infra:crawl -- --all   # every active source (refresh-button behaviour)
 */
import prisma from '../../src/lib/prisma';
import { finalizeRun, processSourceRun, runScheduled, startRun } from '../../src/lib/infra-intel/pipeline';

async function main() {
  if (process.argv.includes('--all')) {
    const run = await startRun('MANUAL', null);
    if (!run) throw new Error('could not start run');
    for (const sr of run.sourceRuns) {
      if (sr.status !== 'PENDING') {
        console.log(`  ${sr.source.key.padEnd(24)} SKIPPED ${sr.error ?? ''}`);
        continue;
      }
      let r = await processSourceRun(sr.id);
      while (r.more) r = await processSourceRun(sr.id);
      console.log(`  ${sr.source.key.padEnd(24)} ${r.status.padEnd(7)} fetched=${r.fetched} new=${r.newDocs} signals=${r.signals} auto=${r.autoApplied} queued=${r.queued}${r.error ? ' err=' + r.error : ''}`);
    }
    console.log(await finalizeRun(run.id));
  } else {
    console.log(await runScheduled(10 * 60 * 1000));
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
