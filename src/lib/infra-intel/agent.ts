/**
 * Weekly AI status check of projects we already track.
 *
 * The crawler discovers news; this closes the loop the other way — for each
 * tracked project (Hyderabad focus zone first, least-recently-verified first)
 * Claude runs a few web searches and reports the latest status with source
 * URLs. The answer becomes an ordinary InfraSignal and goes through the same
 * learned policy, so the "agent-status" source earns or loses trust like any
 * other. Needs a real ANTHROPIC_API_KEY; skipped cleanly otherwise.
 */
import Anthropic from '@anthropic-ai/sdk';
import type { InfraSource } from '@prisma/client';
import prisma from '../prisma';
import { claudeEnabled, EXTRACT_MODEL } from './extract';
import { handleFact, loadMatchable } from './pipeline';
import type { ExtractedFact, EventType, InfraStatusValue } from './text';
import { STATUS_RANK } from './text';

const PER_CALL = 3; // projects per request — keeps each request well inside the function time limit
const RECHECK_DAYS = 6;

interface AgentAnswer {
  found: boolean;
  status: InfraStatusValue | null;
  completionPct: number | null;
  estimatedCompletion: string | null;
  investmentCr: number | null;
  latestDevelopment: string;
  eventDate: string | null;
  sources: string[];
  confidence: number;
}

const SYSTEM = `You verify the current status of an infrastructure project in Telangana, India, for a land-investment research product.
Search the web (prefer government, agency and established newspaper sources from the last 12 months). Then reply with ONLY a JSON object:
{"found": boolean, "status": one of ANNOUNCED|APPROVED|LAND_ACQUISITION|UNDER_CONSTRUCTION|PARTIALLY_COMPLETE|COMPLETE|DELAYED|CANCELLED or null,
 "completionPct": integer or null, "estimatedCompletion": string like "Jun 2027" or null, "investmentCr": number (₹ crore) or null,
 "latestDevelopment": one sentence in your own words, "eventDate": "YYYY-MM-DD" or null, "sources": [urls you relied on], "confidence": 0-100}
Only report what the sources state. If nothing recent is found, found=false.`;

function parseAnswer(text: string): AgentAnswer | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1)) as AgentAnswer;
  } catch {
    return null;
  }
}

async function askClaude(project: { name: string; status: string; routeDescription: string | null }): Promise<{ answer: AgentAnswer | null; citedUrls: string[] }> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const messages: Anthropic.MessageParam[] = [
    {
      role: 'user',
      content: `Project: ${project.name}\nWhere: ${project.routeDescription ?? 'Hyderabad / Telangana'}\nOur current status: ${project.status}\nWhat is its latest status?`,
    },
  ];
  const citedUrls = new Set<string>();
  for (let turn = 0; turn < 3; turn++) {
    const response = await client.messages.create({
      model: EXTRACT_MODEL,
      max_tokens: 16000,
      system: SYSTEM,
      output_config: { effort: 'medium' },
      tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: 4, user_location: { type: 'approximate', country: 'IN', region: 'Telangana', city: 'Hyderabad' } }],
      messages,
    });
    for (const block of response.content) {
      if (block.type === 'web_search_tool_result' && Array.isArray(block.content)) {
        for (const r of block.content) if (r.type === 'web_search_result') citedUrls.add(r.url);
      }
    }
    if (response.stop_reason === 'pause_turn') {
      messages.push({ role: 'assistant', content: response.content });
      continue;
    }
    if (response.stop_reason === 'refusal') return { answer: null, citedUrls: [] };
    const text = response.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('');
    return { answer: parseAnswer(text), citedUrls: [...citedUrls] };
  }
  return { answer: null, citedUrls: [...citedUrls] };
}

function toFact(projectName: string, currentStatus: string, a: AgentAnswer): ExtractedFact {
  let eventType: EventType = 'PROGRESS_UPDATE';
  if (a.status === 'DELAYED') eventType = 'DELAY';
  else if (a.status === 'COMPLETE' || a.status === 'PARTIALLY_COMPLETE') eventType = 'COMPLETION';
  else if (a.status === 'LAND_ACQUISITION') eventType = 'LAND_ACQUISITION';
  else if (a.status && (STATUS_RANK[a.status] ?? 0) !== (STATUS_RANK[currentStatus] ?? 0)) eventType = 'STATUS_CHANGE';
  return {
    projectName,
    eventType,
    proposedStatus: a.status,
    category: null,
    completionPct: a.completionPct,
    investmentCr: a.investmentCr,
    lengthKm: null,
    goRef: null,
    targetCompletion: a.estimatedCompletion,
    places: [],
    summary: a.latestDevelopment,
    // Web-searched answers without a source URL are not trusted.
    confidence: a.sources.length === 0 ? Math.min(40, a.confidence) : Math.max(0, Math.min(90, a.confidence)),
  };
}

export async function runAgentBatch(source: InfraSource): Promise<{ checked: number; signals: number; autoApplied: number; queued: number; more: boolean; skipped?: string }> {
  if (!claudeEnabled()) return { checked: 0, signals: 0, autoApplied: 0, queued: 0, more: false, skipped: 'No Anthropic API key configured — AI status check skipped' };

  const recheckCutoff = new Date(Date.now() - RECHECK_DAYS * 86400000);
  const recentlyChecked = new Set(
    (await prisma.infraSignal.findMany({ where: { sourceId: source.id, createdAt: { gte: recheckCutoff } }, select: { infraProjectId: true } }))
      .map((s) => s.infraProjectId)
      .filter((x): x is string => !!x),
  );
  const candidates = await prisma.infraProject.findMany({
    where: { isPublished: true, status: { notIn: ['COMPLETE', 'CANCELLED'] } },
    orderBy: [{ lastVerifiedDate: { sort: 'asc', nulls: 'first' } }],
    select: { id: true, name: true, status: true, routeDescription: true, focusZone: true },
  });
  // Hyderabad focus zone first, then the rest of the state.
  const rank = (z: string | null) => (z === 'INSIDE_RRR' ? 0 : z === 'RRR_BUFFER' ? 1 : z === null ? 2 : 3);
  const queue = candidates.filter((p) => !recentlyChecked.has(p.id)).sort((a, b) => rank(a.focusZone) - rank(b.focusZone));
  const batch = queue.slice(0, PER_CALL);

  const projects = await loadMatchable();
  const out = { checked: 0, signals: 0, autoApplied: 0, queued: 0 };
  for (const p of batch) {
    out.checked++;
    let answer: AgentAnswer | null = null;
    let citedUrls: string[] = [];
    try {
      ({ answer, citedUrls } = await askClaude(p));
    } catch (e) {
      console.error(`[infra-intel] agent check failed for ${p.name}:`, e instanceof Error ? e.message : e);
    }
    if (!answer || !answer.found) {
      // Record the check so it is not retried until next week.
      await prisma.infraSignal.create({
        data: {
          sourceId: source.id,
          infraProjectId: p.id,
          eventType: 'OTHER',
          projectName: p.name,
          extracted: { headline: `Status check: ${p.name}`, url: null, answer: answer as unknown as object } as object,
          extractor: 'agent',
          confidence: 0,
          decision: 'IGNORED',
          decisionReason: answer ? 'No recent public update found' : 'Status check failed',
        },
      });
      continue;
    }
    const sources = answer.sources.length ? answer.sources : citedUrls.slice(0, 3);
    const outcome = await handleFact({
      fact: toFact(p.name, p.status, { ...answer, sources }),
      extractor: 'agent',
      source,
      documentId: null,
      headline: `Status check: ${p.name} — ${answer.latestDevelopment}`,
      text: `${p.name} ${answer.latestDevelopment}`,
      url: sources[0] ?? null,
      eventDate: answer.eventDate ? new Date(answer.eventDate) : null,
      projects,
      forcedProjectId: p.id,
      extra: { sources },
    });
    out.signals++;
    if (outcome === 'AUTO_APPLIED') out.autoApplied++;
    if (outcome === 'QUEUED') out.queued++;
  }
  return { ...out, more: queue.length > batch.length };
}
