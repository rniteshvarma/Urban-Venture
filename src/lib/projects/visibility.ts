/**
 * Who may see a project, and which of its fields are public.
 *
 * Anyone: an approved, published listing that isn't archived (sold-out ones
 * stay readable so old links keep working). The listing's owner and admins
 * also see their pending, rejected or paused listings. Internal review notes,
 * the owner's id, survey numbers and engagement counters are never public.
 */
export interface VisibilityFields {
  status: string;
  reviewState: string;
  listingStatus: string;
  ownerId: string | null;
}

export function isPubliclyVisible(p: VisibilityFields): boolean {
  return p.listingStatus === "APPROVED" && p.reviewState === "PUBLISHED" && p.status !== "ARCHIVED";
}

export function canView(p: VisibilityFields, viewer: { userId: string | null; isAdmin: boolean }): boolean {
  return isPubliclyVisible(p) || viewer.isAdmin || (!!viewer.userId && viewer.userId === p.ownerId);
}

/** Fields stripped before a project goes to anyone but an admin. */
export const PRIVATE_PROJECT_FIELDS = [
  "ownerId", "reviewedBy", "reviewNote", "sellerFeedback", "rejectReason", "extractionJobId",
  "surveyNumbers", "viewCount", "saveCount", "enquiryCount", "scoreHistory", "listingScore", "scoreBreakdown",
] as const;

export function withoutPrivateFields<T extends Record<string, unknown>>(p: T): Omit<T, (typeof PRIVATE_PROJECT_FIELDS)[number]> {
  const out: Record<string, unknown> = { ...p };
  for (const k of PRIVATE_PROJECT_FIELDS) delete out[k];
  return out as Omit<T, (typeof PRIVATE_PROJECT_FIELDS)[number]>;
}
