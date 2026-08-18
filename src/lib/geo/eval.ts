/**
 * Resolver accuracy metrics (AGENTS.md geo spec, Part 5). Pure functions so the
 * classification + precision/recall/F1 logic is unit-testable without a DB.
 *
 * A golden case's expectedLgd === null means "correctly has no match" — the
 * resolver is expected NOT to resolve it.
 */

import type { ResolveResult } from './resolver';

export type EvalClass = 'correct' | 'incorrect' | 'unresolved';

export interface GoldenCase {
  expectedLgd: string | null;
}

/**
 * Classify one resolver result against its expected LGD.
 *   expected present:  resolved-to-expected = correct; resolved-to-other = incorrect;
 *                      queued/no-match = unresolved
 *   expected null:     resolved = incorrect (false positive); not-resolved = correct
 */
export function classify(result: ResolveResult, expectedLgd: string | null): EvalClass {
  const resolved = result.status === 'RESOLVED';
  if (expectedLgd) {
    if (resolved) return result.lgdCode === expectedLgd ? 'correct' : 'incorrect';
    return 'unresolved';
  }
  // No match expected.
  return resolved ? 'incorrect' : 'correct';
}

export interface Metrics {
  total: number;
  correct: number;
  incorrect: number;
  unresolved: number;
  precision: number; // correct / (correct + incorrect) — guards wrong matches
  recall: number; // correctly-resolved positives / positives-with-expected-match
  f1: number;
}

export interface ClassifiedCase {
  cls: EvalClass;
  expectedLgd: string | null;
}

export function computeMetrics(cases: ClassifiedCase[]): Metrics {
  let correct = 0;
  let incorrect = 0;
  let unresolved = 0;
  let expectedPositives = 0;
  let correctPositives = 0;

  for (const c of cases) {
    if (c.cls === 'correct') correct++;
    else if (c.cls === 'incorrect') incorrect++;
    else unresolved++;

    if (c.expectedLgd) {
      expectedPositives++;
      if (c.cls === 'correct') correctPositives++;
    }
  }

  const precision = correct + incorrect > 0 ? correct / (correct + incorrect) : 1;
  const recall = expectedPositives > 0 ? correctPositives / expectedPositives : 1;
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

  return {
    total: cases.length,
    correct,
    incorrect,
    unresolved,
    precision,
    recall,
    f1,
  };
}
