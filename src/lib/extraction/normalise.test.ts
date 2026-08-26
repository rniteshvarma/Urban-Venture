import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseIndianCurrency, convertArea, parseAreaUnit } from './normalise';

test('parseIndianCurrency: lakh with note', () => {
  const r = parseIndianCurrency('₹45.5 Lakhs onwards');
  assert.equal(r.rupees, 4550000);
  assert.equal(r.lakh, 45.5);
  assert.equal(r.note, 'onwards');
});

test('parseIndianCurrency: crore', () => {
  const r = parseIndianCurrency('Rs. 1.2 Cr');
  assert.equal(r.rupees, 12000000);
  assert.equal(r.lakh, 120);
  assert.equal(r.crore, 1.2);
});

test('parseIndianCurrency: rate per sq.ft (not a total)', () => {
  const r = parseIndianCurrency('₹4,999/sq.ft');
  assert.equal(r.ratePerSqFt, 4999);
  assert.equal(r.rupees, undefined);
  assert.equal(r.lakh, undefined);
});

test('parseIndianCurrency: Indian-grouped plain rupees', () => {
  const r = parseIndianCurrency('₹1,25,00,000');
  assert.equal(r.rupees, 12500000);
  assert.equal(r.lakh, 125);
});

test('parseIndianCurrency: bare L suffix', () => {
  const r = parseIndianCurrency('45.5L');
  assert.equal(r.lakh, 45.5);
  assert.equal(r.rupees, 4550000);
});

test('parseIndianCurrency: rate per sq.yd + GST note', () => {
  const r = parseIndianCurrency('₹35,000 per sq.yd + GST');
  assert.equal(r.ratePerSqYd, 35000);
  assert.equal(r.note, '+ gst');
});

test('convertArea: all supported units (spec examples)', () => {
  assert.deepEqual(convertArea(200, 'SQYD'), { sqFt: 1800, sqYd: 200 });
  assert.deepEqual(convertArea(1, 'ACRE'), { sqFt: 43560, sqYd: 4840 });
  assert.deepEqual(convertArea(1, 'GUNTHA'), { sqFt: 1089, sqYd: 121 });
  assert.deepEqual(convertArea(1, 'CENT'), { sqFt: 435.6, sqYd: 48.4 });
  assert.deepEqual(convertArea(1, 'ANKANAM'), { sqFt: 72, sqYd: 8 });
  assert.deepEqual(convertArea(100, 'SQM'), { sqFt: 1076.4, sqYd: 119.6 });
  assert.deepEqual(convertArea(1245, 'SQFT'), { sqFt: 1245, sqYd: 138.3 });
});

test('parseAreaUnit: free-text tokens', () => {
  assert.equal(parseAreaUnit('Sq. Yards'), 'SQYD');
  assert.equal(parseAreaUnit('sq.ft'), 'SQFT');
  assert.equal(parseAreaUnit('guntas'), 'GUNTHA');
  assert.equal(parseAreaUnit('Ankanam'), 'ANKANAM');
  assert.equal(parseAreaUnit('bananas'), null);
});
