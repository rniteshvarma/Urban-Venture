import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv, parseCsvTable, findColumn, findColumnOptional } from './csv';

test('parseCsv: simple rows', () => {
  assert.deepEqual(parseCsv('a,b,c\n1,2,3'), [['a', 'b', 'c'], ['1', '2', '3']]);
});

test('parseCsv: quoted commas, escaped quotes, quoted newline', () => {
  const text = 'name,note\n"Rampur, Kothur","he said ""hi"""\n"multi\nline",ok';
  assert.deepEqual(parseCsv(text), [
    ['name', 'note'],
    ['Rampur, Kothur', 'he said "hi"'],
    ['multi\nline', 'ok'],
  ]);
});

test('parseCsv: CRLF and BOM', () => {
  assert.deepEqual(parseCsv('﻿a,b\r\n1,2\r\n'), [['a', 'b'], ['1', '2']]);
});

test('parseCsvTable: objects keyed by header, blank rows dropped', () => {
  const t = parseCsvTable('Code,Name\n536,Kadthal\n\n537,Amangal\n');
  assert.deepEqual(t.header, ['Code', 'Name']);
  assert.equal(t.rows.length, 2);
  assert.deepEqual(t.rows[0], { Code: '536', Name: 'Kadthal' });
});

test('findColumn: fuzzy header match', () => {
  const header = ['State Code', 'District Name (In English)', 'District Version'];
  assert.equal(findColumn(header, ['district', 'name'], 'district name'), 'District Name (In English)');
  assert.equal(findColumn(header, ['state', 'code'], 'state code'), 'State Code');
});

test('findColumn: throws with available headers when missing', () => {
  assert.throws(() => findColumn(['Foo', 'Bar'], ['village', 'code'], 'village code'), /Available headers: Foo \| Bar/);
});

test('findColumn: exclude disambiguates District vs Sub-District', () => {
  const header = ['Sub-District Code', 'Sub-District Name(In English)', 'District Code', 'District Name(In English)'];
  // Without exclude, ['district','code'] would match the sub-district column first.
  assert.equal(findColumn(header, ['district', 'code'], 'district code', ['sub']), 'District Code');
  assert.equal(findColumn(header, ['sub', 'district', 'code'], 'mandal code'), 'Sub-District Code');
});

test('findColumnOptional: returns null instead of throwing', () => {
  assert.equal(findColumnOptional(['A', 'B'], ['village', 'telugu']), null);
});
