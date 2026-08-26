/**
 * Extraction orchestrator (Architecture C). Runs after the upload response via
 * next/server `after()`, updating the job row so the client can poll progress.
 * extract → normalise → create DRAFT project → READY_FOR_REVIEW.
 */

import prisma from '../prisma';
import { extractFromFiles, type ExtractFile } from './extract';
import { createDraftFromExtraction } from './draft';
import { summariseConfidence } from './schema';

export interface RunMeta {
  sourceFormat: 'PDF' | 'IMAGE_SET' | 'MIXED';
  hints?: { developer?: string; corridor?: string; city?: string };
  declaredRoles?: (string | null)[];
  mediaInputs?: Array<{ fileUrl: string; mimeType: string; fileSizeKb: number; declaredRole?: string | null; isScreenshot?: boolean }>;
}

export async function runExtraction(jobId: string, files: ExtractFile[], meta: RunMeta): Promise<void> {
  const start = Date.now();
  try {
    await prisma.extractionJob.update({
      where: { id: jobId },
      data: { status: 'ANALYSING', stage: 'Analysing content', progressPct: 45 },
    });

    const out = await extractFromFiles(files, {
      sourceFormat: meta.sourceFormat,
      hints: meta.hints,
      declaredRoles: meta.declaredRoles,
    });

    if (out.error || !out.result) {
      await prisma.extractionJob.update({
        where: { id: jobId },
        data: { status: 'FAILED', errorStage: 'ANALYSING', errorMessage: out.error ?? 'No extraction result', completedAt: new Date(), durationMs: Date.now() - start, tokensUsed: out.tokensUsed ?? null },
      });
      return;
    }

    await prisma.extractionJob.update({
      where: { id: jobId },
      data: { status: 'NORMALISING', stage: 'Normalising & building draft', progressPct: 80, rawExtraction: out.result as object, tokensUsed: out.tokensUsed ?? null },
    });

    const summary = summariseConfidence(out.result);
    const draft = await createDraftFromExtraction(
      { id: jobId, sourceFormat: meta.sourceFormat },
      out.result,
      { hintCorridor: meta.hints?.corridor, media: meta.mediaInputs },
    );

    await prisma.extractionJob.update({
      where: { id: jobId },
      data: {
        status: 'READY_FOR_REVIEW',
        stage: 'Ready for review',
        progressPct: 100,
        projectId: draft.projectId,
        overallConfidence: summary.overall,
        fieldsExtracted: summary.extracted,
        fieldsLowConfidence: summary.lowConfidence,
        completedAt: new Date(),
        durationMs: Date.now() - start,
      },
    });
  } catch (err) {
    await prisma.extractionJob
      .update({
        where: { id: jobId },
        data: { status: 'FAILED', errorMessage: err instanceof Error ? err.message : String(err), completedAt: new Date(), durationMs: Date.now() - start },
      })
      .catch(() => {});
  }
}
