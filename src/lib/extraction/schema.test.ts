import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseExtraction, summariseConfidence } from './schema';
import { buildExtractionPrompt } from './prompt';

const SAMPLE = `\`\`\`json
{
  "project": {
    "name": { "value": "Shadnagar Greens", "page": 1, "snippet": "Shadnagar Greens", "confidence": 0.96 },
    "developer": { "value": "Dharani Infra", "page": 1, "confidence": "0.91" },
    "reraNumber": { "value": "P02400001234", "page": 17, "confidence": 0.54 }
  },
  "unitTypes": [
    { "label": { "value": "2 BHK", "confidence": 0.92 }, "areaValue": { "value": 1245, "confidence": 0.9 }, "areaUnit": { "value": "SQFT", "confidence": 0.9 }, "priceValue": { "value": 58.5, "confidence": 0.88 }, "priceUnit": { "value": "TOTAL_LAKH", "confidence": 0.88 } },
    { "label": { "value": "3 BHK", "confidence": 0.41 }, "priceValue": { "value": null, "confidence": 0.41 } }
  ],
  "amenities": { "value": ["Clubhouse", "Pool"], "page": 12, "confidence": 0.8 },
  "documentQuality": { "isBrochure": true, "legibility": "GOOD", "concerns": [], "multipleProjectsDetected": false }
}
\`\`\``;

test('parseExtraction: parses fenced JSON, coerces string confidence', () => {
  const r = parseExtraction(SAMPLE);
  assert.equal(r.ok, true);
  assert.equal(r.data!.project!.name!.value, 'Shadnagar Greens');
  assert.equal(r.data!.project!.developer!.confidence, 0.91); // "0.91" coerced
  assert.equal(r.data!.unitTypes.length, 2);
  assert.equal(r.data!.unitTypes[0].areaUnit!.value, 'SQFT');
});

test('parseExtraction: rejects invalid JSON', () => {
  const r = parseExtraction('not json at all {');
  assert.equal(r.ok, false);
  assert.match(r.error!, /Invalid JSON/);
});

test('summariseConfidence: counts extracted + low-confidence fields', () => {
  const r = parseExtraction(SAMPLE);
  const s = summariseConfidence(r.data!);
  // name .96, developer .91, rera .54, unit0 label/area/areaUnit/price/priceUnit, unit1 label(.41) — priceValue null excluded, amenities .8
  assert.ok(s.extracted >= 9);
  assert.ok(s.lowConfidence >= 2); // rera .54 + 3BHK label .41
  assert.ok(s.overall > 0 && s.overall <= 1);
});

test('buildExtractionPrompt: image variant adds photo rules + role hints', () => {
  const pdf = buildExtractionPrompt({ sourceFormat: 'PDF' });
  assert.ok(!/PHOTOGRAPHS/.test(pdf));
  const img = buildExtractionPrompt({ sourceFormat: 'IMAGE_SET', declaredRoles: ['PRICE_LIST', null] });
  assert.match(img, /NEVER guess a digit/);
  assert.match(img, /image 1: PRICE_LIST/);
  assert.match(img, /image 2: unlabelled/);
});
