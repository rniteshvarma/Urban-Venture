/**
 * Golden-set CSV import / export (AGENTS.md geo spec, Part 5).
 *
 *   npm run golden:import -- --file=./data/golden/tg-golden.csv
 *   npm run golden:export -- --file=./data/golden/export.csv
 *
 * CSV columns: source,rawName,rawDistrict,rawMandal,expectedLgd,notes
 * An empty expectedLgd means "correctly has no match". A field agent who knows
 * the geography fills expectedLgd; import upserts by (source,rawName,district,mandal).
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import prisma from '../../src/lib/prisma';
import { parseCsvTable, findColumn, findColumnOptional } from '../etl/lib/csv';

function arg(name: string): string | undefined {
  return process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
}

function csvField(v: string | null | undefined): string {
  const s = v ?? '';
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

async function importCsv(file: string) {
  const t = parseCsvTable(readFileSync(file, 'utf8'));
  const cSource = findColumn(t.header, ['source'], 'source');
  const cName = findColumn(t.header, ['raw', 'name'], 'rawName');
  const cDist = findColumnOptional(t.header, ['raw', 'district']);
  const cMandal = findColumnOptional(t.header, ['raw', 'mandal']);
  const cExpected = findColumnOptional(t.header, ['expected', 'lgd']);
  const cNotes = findColumnOptional(t.header, ['notes']);
  const labelledBy = arg('by') ?? 'import';

  let created = 0;
  for (const r of t.rows) {
    const rawDistrict = cDist ? r[cDist] || null : null;
    const rawMandal = cMandal ? r[cMandal] || null : null;
    // No unique constraint on GoldenTestCase — dedupe manually.
    const existing = await prisma.goldenTestCase.findFirst({
      where: { source: r[cSource], rawName: r[cName], rawDistrict, rawMandal },
    });
    const data = {
      source: r[cSource],
      rawName: r[cName],
      rawDistrict,
      rawMandal,
      expectedLgd: cExpected ? r[cExpected] || null : null,
      notes: cNotes ? r[cNotes] || null : null,
      labelledBy,
    };
    if (existing) await prisma.goldenTestCase.update({ where: { id: existing.id }, data });
    else {
      await prisma.goldenTestCase.create({ data });
      created++;
    }
  }
  console.log(`✓ Imported ${t.rows.length} golden cases (${created} new) from ${file}`);
}

async function exportCsv(file: string) {
  const rows = await prisma.goldenTestCase.findMany({ orderBy: [{ source: 'asc' }, { rawName: 'asc' }] });
  const header = 'source,rawName,rawDistrict,rawMandal,expectedLgd,notes';
  const lines = rows.map((r) =>
    [r.source, r.rawName, r.rawDistrict, r.rawMandal, r.expectedLgd, r.notes].map(csvField).join(','),
  );
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, [header, ...lines].join('\n') + '\n');
  console.log(`✓ Exported ${rows.length} golden cases to ${file}`);
}

async function main() {
  const file = arg('file');
  const mode = process.argv.includes('--export') ? 'export' : process.argv.includes('--import') ? 'import' : null;
  if (!file || !mode) {
    console.error('Usage: golden-set --import|--export --file=path.csv');
    process.exit(1);
  }
  if (mode === 'import') await importCsv(file);
  else await exportCsv(file);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('✖ golden-set failed:', e instanceof Error ? e.message : e);
  await prisma.$disconnect();
  process.exit(1);
});
