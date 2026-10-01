/**
 * Fact extraction: Claude when a real key is configured, rules otherwise.
 *
 * Claude sees a batch of headlines (+ feed summaries) and the list of
 * projects we already track, and returns one structured fact per relevant
 * item — including which known project it refers to. It never decides whether
 * a fact is applied; policy.ts does (AI narrates/extracts, never decides).
 *
 * Learning hook: recent admin rejections (with their notes) are fed back into
 * the prompt as "mistakes to avoid", so extraction improves with review.
 */
import Anthropic from '@anthropic-ai/sdk';
import { rulesExtract, type ExtractedFact, type EventType } from './text';
import { findPlaces } from './geo';

export const EXTRACT_MODEL = 'claude-opus-5';
const BATCH = 12;

export interface ExtractInput {
  key: string; // caller's id for the item
  title: string;
  summary: string | null;
  publisher: string | null;
  publishedAt: Date | null;
}

export interface KnownProject {
  id: string;
  name: string;
  status: string;
}

export interface LearnedMistake {
  title: string;
  extractedAs: string;
  note: string | null;
}

export function claudeEnabled(): boolean {
  const k = process.env.ANTHROPIC_API_KEY;
  return !!k && !k.startsWith('mock') && k.length > 20;
}

const EVENTS: EventType[] = ['NEW_PROJECT', 'STATUS_CHANGE', 'PROGRESS_UPDATE', 'TENDER', 'BUDGET', 'LAND_ACQUISITION', 'DELAY', 'COMPLETION', 'MILESTONE', 'OTHER'];
const STATUSES = ['ANNOUNCED', 'APPROVED', 'LAND_ACQUISITION', 'UNDER_CONSTRUCTION', 'PARTIALLY_COMPLETE', 'COMPLETE', 'DELAYED', 'CANCELLED'];
const CATEGORIES = ['ROAD_HIGHWAY', 'METRO_RAIL', 'INDUSTRIAL_ZONE', 'PHARMA_BIOTECH', 'LOGISTICS_PARK', 'AIRPORT_AVIATION', 'GOVT_APPROVAL', 'TOWNSHIP', 'IT_TECH_PARK', 'UTILITY'];

const nullable = (schema: Record<string, unknown>) => ({ anyOf: [schema, { type: 'null' }] });

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['facts'],
  properties: {
    facts: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'key', 'relevant', 'projectName', 'matchedProjectId', 'eventType', 'proposedStatus', 'category', 'completionPct',
          'investmentCr', 'lengthKm', 'goRef', 'targetCompletion', 'places', 'summary', 'confidence',
        ],
        properties: {
          key: { type: 'string' },
          relevant: { type: 'boolean' },
          projectName: { type: 'string' },
          matchedProjectId: nullable({ type: 'string' }),
          eventType: { type: 'string', enum: EVENTS },
          proposedStatus: nullable({ type: 'string', enum: STATUSES }),
          category: nullable({ type: 'string', enum: CATEGORIES }),
          completionPct: nullable({ type: 'integer' }),
          investmentCr: nullable({ type: 'number' }),
          lengthKm: nullable({ type: 'number' }),
          goRef: nullable({ type: 'string' }),
          targetCompletion: nullable({ type: 'string' }),
          places: { type: 'array', items: { type: 'string' } },
          summary: { type: 'string' },
          confidence: { type: 'integer' },
        },
      },
    },
  },
};

const SYSTEM = `You extract infrastructure-project facts for a Hyderabad / Telangana land-investment research product.

For each item decide whether it reports a concrete development about a physical infrastructure project in Telangana: roads (widening, flyovers, underpasses, ROB/RUB, elevated corridors, radial/link roads, ORR/RRR, national highways), metro/rail/MMTS, airports, industrial/IT/pharma/logistics parks, townships/master plans, water/power/sewage works.
Not relevant: accidents, crime, traffic jams, politics without a project decision, opinion pieces, projects outside Telangana.

Rules:
- relevant=false items still need every field; use projectName="" and eventType="OTHER".
- matchedProjectId: the id of a KNOWN PROJECT only if the item is clearly about that same project (same stretch/phase/arc). Otherwise null — a new project.
- proposedStatus is the project's stage implied by the item: tender floated/awarded → APPROVED; land acquisition notified → LAND_ACQUISITION; works started/progressing → UNDER_CONSTRUCTION; a stretch opened → PARTIALLY_COMPLETE; fully opened → COMPLETE; deadline pushed / on hold → DELAYED; scrapped → CANCELLED; only proposed → ANNOUNCED.
- Numbers only if stated: investmentCr in ₹ crore (1 lakh crore = 100000), lengthKm, completionPct.
- places: Telangana localities/towns named in the item (e.g. "Uppal", "Shamshabad").
- projectName: a short canonical name, e.g. "Uppal–Narapally elevated corridor", "Regional Ring Road (RRR) – Southern Arc".
- summary: one plain sentence of what changed, in your own words (never copy the article).
- confidence 0-100: how sure you are the fact is correct AND correctly attributed. Headlines alone rarely justify > 85.`;

function claude(): Anthropic {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

async function claudeBatch(items: ExtractInput[], known: KnownProject[], mistakes: LearnedMistake[]): Promise<Map<string, ExtractedFact | null>> {
  const knownList = known.map((p) => `- ${p.id} | ${p.name} | ${p.status}`).join('\n') || '(none yet)';
  const mistakeList = mistakes.length
    ? mistakes.map((m) => `- "${m.title}" was extracted as ${m.extractedAs} and REJECTED by a reviewer${m.note ? `: ${m.note}` : ''}`).join('\n')
    : '(none)';
  const itemList = items
    .map((it) => `[${it.key}] ${it.title}${it.summary ? `\n    ${it.summary.slice(0, 400)}` : ''}${it.publisher ? `\n    (${it.publisher}${it.publishedAt ? `, ${it.publishedAt.toISOString().slice(0, 10)}` : ''})` : ''}`)
    .join('\n');

  const response = await claude().messages.create({
    model: EXTRACT_MODEL,
    max_tokens: 16000,
    system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
    output_config: { effort: 'medium', format: { type: 'json_schema', schema: SCHEMA } },
    messages: [
      {
        role: 'user',
        content: `KNOWN PROJECTS (id | name | current status):\n${knownList}\n\nPAST MISTAKES TO AVOID:\n${mistakeList}\n\nITEMS:\n${itemList}\n\nReturn one fact per item key.`,
      },
    ],
  });

  const out = new Map<string, ExtractedFact | null>();
  if (response.stop_reason === 'refusal' || response.stop_reason === 'max_tokens') return out; // caller falls back to rules
  const text = response.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('');
  const parsed = JSON.parse(text) as { facts: (ExtractedFact & { key: string; relevant: boolean })[] };
  const knownIds = new Set(known.map((p) => p.id));
  for (const f of parsed.facts) {
    if (!f.relevant) {
      out.set(f.key, null);
      continue;
    }
    out.set(f.key, {
      ...f,
      matchedProjectId: f.matchedProjectId && knownIds.has(f.matchedProjectId) ? f.matchedProjectId : null,
      completionPct: f.completionPct !== null && f.completionPct >= 0 && f.completionPct <= 100 ? f.completionPct : null,
      confidence: Math.max(0, Math.min(100, f.confidence)),
    });
  }
  return out;
}

export interface ExtractionResult {
  fact: ExtractedFact | null;
  extractor: 'claude' | 'rules';
}

/** Extract facts for many items. Claude in batches; any item Claude misses falls back to rules. */
export async function extractFacts(items: ExtractInput[], known: KnownProject[], mistakes: LearnedMistake[] = []): Promise<Map<string, ExtractionResult>> {
  const results = new Map<string, ExtractionResult>();
  if (claudeEnabled()) {
    for (let i = 0; i < items.length; i += BATCH) {
      const chunk = items.slice(i, i + BATCH);
      try {
        const got = await claudeBatch(chunk, known, mistakes);
        for (const [k, fact] of got) results.set(k, { fact, extractor: 'claude' });
      } catch (err) {
        console.error('[infra-intel] Claude extraction failed, using rules for this batch:', err instanceof Error ? err.message : err);
      }
    }
  }
  for (const it of items) {
    if (results.has(it.key)) continue;
    const text = `${it.title} ${it.summary ?? ''}`;
    results.set(it.key, { fact: rulesExtract(it.title, it.summary ?? '', findPlaces(text).map((p) => p.name)), extractor: 'rules' });
  }
  return results;
}
