/**
 * LEGAL GUARD (News module spec, Part 0 constraints 1, 2, 7).
 *
 * Fails the build if the NewsArticle model ever gains a field that would store
 * article body text or a publisher image. Storing body text or hotlinking
 * publisher images is a legal constraint, not a preference — this test is the
 * code-level guarantee the spec demands. Runs in the normal suite (`test:geo`).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const schemaPath = join(here, '..', '..', '..', 'prisma', 'schema.prisma');

/** Extract the `model NewsArticle { ... }` block with line-comments stripped. */
function newsArticleFields(): string {
  const schema = readFileSync(schemaPath, 'utf8');
  const m = schema.match(/model\s+NewsArticle\s*\{([\s\S]*?)\n\}/);
  assert.ok(m, 'NewsArticle model not found in schema.prisma');
  return m![1]
    .split('\n')
    .map((line) => line.replace(/\/\/.*$/, '')) // drop comments so intent notes don't false-positive
    .join('\n');
}

const FORBIDDEN = ['articleBody', 'fullText', 'content', 'body', 'imageUrl', 'imageURL', 'thumbnail'];

for (const field of FORBIDDEN) {
  test(`NewsArticle must not declare a "${field}" field (legal constraint)`, () => {
    const body = newsArticleFields();
    // Match a field declaration: name at start of a line (after whitespace).
    const re = new RegExp(`^\\s*${field}\\b`, 'mi');
    assert.equal(re.test(body), false, `Forbidden field "${field}" present on NewsArticle — see spec Part 0.`);
  });
}

test('NewsArticle keeps its verbatim-attribution fields', () => {
  const body = newsArticleFields();
  for (const required of ['headline', 'sourceName', 'canonicalUrl', 'publishedAt', 'ourAnalysis']) {
    assert.ok(new RegExp(`^\\s*${required}\\b`, 'm').test(body), `missing required field ${required}`);
  }
});
