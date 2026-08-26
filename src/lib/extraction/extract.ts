/**
 * Stage 5 — Claude-native extraction (Architecture C, no worker).
 * PDFs go as a document block; images go as vision blocks. Output is parsed and
 * validated by the Zod contract (schema.ts).
 */

import Anthropic from '@anthropic-ai/sdk';
import { EXTRACTION_SYSTEM, buildExtractionPrompt, type PromptOptions } from './prompt';
import { parseExtraction, type ExtractionResult } from './schema';

const MODEL = 'claude-sonnet-5'; // current Sonnet; supports PDF documents + vision
const MAX_TOKENS = 8000;

/** media types Claude vision accepts directly (HEIC must be converted first). */
export const VISION_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export interface ExtractFile {
  buffer: Buffer;
  mediaType: string; // "application/pdf" | "image/jpeg" | ...
}

export interface ExtractResult {
  result?: ExtractionResult;
  raw: string;
  error?: string;
  tokensUsed?: number;
}

export async function extractFromFiles(
  files: ExtractFile[],
  opts: PromptOptions,
): Promise<ExtractResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || !apiKey.startsWith('sk-')) {
    return { raw: '', error: 'ANTHROPIC_API_KEY is a placeholder, not a real key (must start with "sk-ant-"). Set a valid key in your env to enable extraction.' };
  }

  const content: Anthropic.MessageCreateParams['messages'][number]['content'] = [];
  for (const f of files) {
    if (f.mediaType === 'application/pdf') {
      content.push({
        type: 'document',
        source: { type: 'base64', media_type: 'application/pdf', data: f.buffer.toString('base64') },
      });
    } else if (VISION_MEDIA_TYPES.includes(f.mediaType)) {
      content.push({
        type: 'image',
        source: { type: 'base64', media_type: f.mediaType as 'image/jpeg', data: f.buffer.toString('base64') },
      });
    }
    // HEIC and other unsupported types are skipped here (converted upstream in a later milestone).
  }
  content.push({ type: 'text', text: buildExtractionPrompt(opts) });

  try {
    // maxRetries covers transient 429/5xx (incl. 502) with backoff; generous timeout for large PDFs.
    const anthropic = new Anthropic({ apiKey, maxRetries: 4, timeout: 180_000 });
    const resp = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: EXTRACTION_SYSTEM,
      messages: [{ role: 'user', content }],
    });
    const text = resp.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n');

    const parsed = parseExtraction(text);
    const tokensUsed = resp.usage.input_tokens + resp.usage.output_tokens;
    if (!parsed.ok) return { raw: text, error: `AI returned unparseable output: ${parsed.error}`, tokensUsed };
    return { result: parsed.data, raw: text, tokensUsed };
  } catch (err) {
    return { raw: '', error: cleanError(err) };
  }
}

/** Turn provider/gateway errors into a short, human message (never raw HTML). */
function cleanError(err: unknown): string {
  const e = err as { status?: number; message?: string };
  const status = e?.status;
  const msg = (e?.message ?? String(err))
    .replace(/<[^>]+>/g, ' ') // strip any HTML (e.g. a Cloudflare 502 page)
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 240);
  if (status === 401) return 'Anthropic rejected the API key (401). Set a valid ANTHROPIC_API_KEY.';
  if (status === 413 || /too large|request entity|payload/i.test(msg)) return 'The file is too large for the AI service. Upload a smaller PDF or fewer pages.';
  if (status === 429) return 'Anthropic rate limit reached (429). Wait a moment and retry.';
  if (status && status >= 500) return `The AI service returned a temporary error (${status}). This is usually transient, or the PDF is very large/complex — retry, or upload a smaller or fewer-page file.`;
  return msg || 'Extraction failed.';
}
