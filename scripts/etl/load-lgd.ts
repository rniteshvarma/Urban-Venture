/**
 * LGD master loader (AGENTS.md geo spec, Part 2.1).
 *
 *   npm run etl:lgd -- --state=TG
 *   npm run etl:lgd -- --state=AP --dir=./data/lgd
 *
 * Reads the Local Government Directory CSV exports (states / districts /
 * subdistricts / villages) and upserts State -> District -> Mandal ->
 * RevenueVillage, computing nameNormalised / namePhonetic / nameTranslit for
 * every village. The LGD portal is captcha-gated, so the operator downloads the
 * CSVs manually into `--dir` (default ./data/lgd).
 *
 * Column names drift between LGD exports; we resolve them fuzzily (findColumn)
 * and fail loudly rather than load nulls.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import prisma from '../../src/lib/prisma';
import { normalise, phoneticKey, transliterateKey } from '../../src/lib/geo/normalise';
import { parseCsvTable, findColumn, findColumnOptional } from './lib/csv';

// Rough expected magnitudes — used only to flag likely-bad downloads (>5% off).
const EXPECTED: Record<string, { name: string; lgdCode: string; districts: number; mandals: number; villages: number }> = {
  TG: { name: 'Telangana', lgdCode: '36', districts: 33, mandals: 612, villages: 10900 },
  AP: { name: 'Andhra Pradesh', lgdCode: '28', districts: 26, mandals: 670, villages: 17000 },
};

function arg(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit?.split('=')[1];
}

function readTable(dir: string, file: string) {
  const path = join(dir, file);
  if (!existsSync(path)) {
    throw new Error(`Missing LGD file: ${path}. Download the ${file} export into ${dir}.`);
  }
  return parseCsvTable(readFileSync(path, 'utf8'));
}

function pct(actual: number, expected: number): string {
  const delta = ((actual - expected) / expected) * 100;
  const flag = Math.abs(delta) > 5 ? '  ⚠ >5% off expected' : '';
  return `${actual} (expected ~${expected}, ${delta >= 0 ? '+' : ''}${delta.toFixed(1)}%)${flag}`;
}

async function main() {
  const stateCode = (arg('state') ?? '').toUpperCase();
  const dir = arg('dir') ?? './data/lgd';
  const expected = EXPECTED[stateCode];
  if (!expected) {
    throw new Error(`Pass --state=TG or --state=AP (got "${stateCode || 'nothing'}")`);
  }

  console.log(`\n▶ LGD load: ${expected.name} (${stateCode}) from ${dir}\n`);

  // ── State ──────────────────────────────────────────────────────────────────
  const statesT = readTable(dir, 'states.csv');
  const sCode = findColumn(statesT.header, ['state', 'code'], 'state code');
  const sName = findColumn(statesT.header, ['state', 'name'], 'state name');
  const stateRow = statesT.rows.find(
    (r) => r[sCode] === expected.lgdCode || r[sName].toUpperCase().includes(expected.name.toUpperCase()),
  );
  if (!stateRow) throw new Error(`State ${expected.name} not found in states.csv`);

  const state = await prisma.state.upsert({
    where: { lgdCode: stateRow[sCode] },
    update: { name: stateRow[sName], code: stateCode },
    create: { lgdCode: stateRow[sCode], name: stateRow[sName], code: stateCode },
  });
  console.log(`  State: ${state.name} (lgd ${state.lgdCode})`);

  // ── Districts ───────────────────────────────────────────────────────────────
  const distT = readTable(dir, 'districts.csv');
  const dStateCode = findColumn(distT.header, ['state', 'code'], 'state code');
  const dCode = findColumn(distT.header, ['district', 'code'], 'district code', ['sub']);
  const dName = findColumn(distT.header, ['district', 'name'], 'district name', ['sub']);
  const distRows = distT.rows.filter((r) => r[dStateCode] === stateRow[sCode]);

  const districtIdByLgd = new Map<string, string>();
  for (const r of distRows) {
    const d = await prisma.district.upsert({
      where: { lgdCode: r[dCode] },
      update: { name: r[dName], stateId: state.id },
      create: { lgdCode: r[dCode], name: r[dName], stateId: state.id },
    });
    districtIdByLgd.set(r[dCode], d.id);
  }
  console.log(`  Districts: ${pct(distRows.length, expected.districts)}`);

  // ── Mandals (sub-districts) ──────────────────────────────────────────────────
  const subT = readTable(dir, 'subdistricts.csv');
  const mStateCode = findColumnOptional(subT.header, ['state', 'code']);
  const mDistCode = findColumn(subT.header, ['district', 'code'], 'parent district code', ['sub']);
  const mCode = findColumn(subT.header, ['sub', 'district', 'code'], 'mandal code');
  const mName = findColumn(subT.header, ['sub', 'district', 'name'], 'mandal name');
  const subRows = subT.rows.filter((r) =>
    mStateCode ? r[mStateCode] === stateRow[sCode] : districtIdByLgd.has(r[mDistCode]),
  );

  const mandalIdByLgd = new Map<string, string>();
  let orphanMandals = 0;
  for (const r of subRows) {
    const districtId = districtIdByLgd.get(r[mDistCode]);
    if (!districtId) {
      orphanMandals++;
      continue;
    }
    const m = await prisma.mandal.upsert({
      where: { lgdCode: r[mCode] },
      update: { name: r[mName], districtId },
      create: { lgdCode: r[mCode], name: r[mName], districtId },
    });
    mandalIdByLgd.set(r[mCode], m.id);
  }
  console.log(`  Mandals: ${pct(mandalIdByLgd.size, expected.mandals)}${orphanMandals ? `  (${orphanMandals} orphaned)` : ''}`);

  // ── Villages ──────────────────────────────────────────────────────────────
  const vilT = readTable(dir, 'villages.csv');
  const vSubCode = findColumn(vilT.header, ['sub', 'district', 'code'], 'parent mandal code');
  const vCode = findColumn(vilT.header, ['village', 'code'], 'village code');
  const vName = findColumn(vilT.header, ['village', 'name', 'english'], 'village name (english)');
  const vLocal = findColumnOptional(vilT.header, ['village', 'name', 'local']) ??
    findColumnOptional(vilT.header, ['village', 'name', 'telugu']);
  const vCensus = findColumnOptional(vilT.header, ['census', '2011']) ??
    findColumnOptional(vilT.header, ['census', 'code']);

  let loaded = 0;
  let orphanVillages = 0;
  const CHUNK = 500;
  for (let i = 0; i < vilT.rows.length; i += CHUNK) {
    const chunk = vilT.rows.slice(i, i + CHUNK);
    for (const r of chunk) {
      const mandalId = mandalIdByLgd.get(r[vSubCode]);
      if (!mandalId) {
        orphanVillages++;
        continue;
      }
      const name = r[vName];
      const telugu = vLocal ? r[vLocal] || null : null;
      const n = normalise(name);
      await prisma.revenueVillage.upsert({
        where: { lgdCode: r[vCode] },
        update: {
          name,
          nameTelugu: telugu,
          mandalId,
          nameNormalised: n.canonical,
          namePhonetic: phoneticKey(n.canonical),
          nameTranslit: telugu ? transliterateKey(telugu) : null,
          censusCode2011: vCensus ? r[vCensus] || null : null,
        },
        create: {
          lgdCode: r[vCode],
          name,
          nameTelugu: telugu,
          mandalId,
          nameNormalised: n.canonical,
          namePhonetic: phoneticKey(n.canonical),
          nameTranslit: telugu ? transliterateKey(telugu) : null,
          censusCode2011: vCensus ? r[vCensus] || null : null,
        },
      });
      loaded++;
    }
    process.stdout.write(`\r  Villages: ${loaded}/${vilT.rows.length}`);
  }
  process.stdout.write('\n');
  console.log(`  Villages: ${pct(loaded, expected.villages)}${orphanVillages ? `  (${orphanVillages} orphaned — no matching mandal)` : ''}`);

  console.log('\n✓ LGD load complete.\n');
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('\n✖ LGD load failed:', e instanceof Error ? e.message : e);
  await prisma.$disconnect();
  process.exit(1);
});
