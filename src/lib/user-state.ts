export type UserState = "EXPLORER" | "ACTIVE_BUYER" | "OWNER";

interface StageLike {
  order: number;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "SKIPPED";
}

/** Index of the current stage = number of completed stages (0-based position of first non-completed). */
export function currentStageIndex(stages: StageLike[]): number {
  const sorted = [...stages].sort((a, b) => a.order - b.order);
  let idx = 0;
  for (const s of sorted) {
    if (s.status === "COMPLETED" || s.status === "SKIPPED") idx++;
    else break;
  }
  return idx;
}

/**
 * OWNER if they've purchased; ACTIVE_BUYER if their roadmap reached Site Visit
 * (index >= 2) or beyond; otherwise EXPLORER. (Spec §2.1)
 */
export function resolveUserState(purchasesCount: number, stages?: StageLike[]): UserState {
  if (purchasesCount > 0) return "OWNER";
  if (stages && stages.length > 0 && currentStageIndex(stages) >= 2) return "ACTIVE_BUYER";
  return "EXPLORER";
}
