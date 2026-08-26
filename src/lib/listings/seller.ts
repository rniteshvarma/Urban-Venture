// Seller profile + listing lifecycle helpers. A SellerProfile is a capability
// layer on the existing User — not a role swap. A user can hold buyer state and
// seller state simultaneously.

import prisma from "@/lib/prisma";

export const LISTING_EXPIRY_DAYS = 90;

/** Statuses that count against a seller's active listing limit / are "live-ish". */
export const ACTIVE_LISTING_STATUSES = ["PENDING_REVIEW", "CHANGES_REQUESTED", "APPROVED", "PAUSED"] as const;

export type ListingEventType =
  | "SUBMITTED"
  | "APPROVED"
  | "CHANGES_REQUESTED"
  | "REJECTED"
  | "EDITED"
  | "REFRESHED"
  | "PAUSED"
  | "RESUMED"
  | "SOLD";

export function expiryFrom(approvedAt: Date): Date {
  return new Date(approvedAt.getTime() + LISTING_EXPIRY_DAYS * 86_400_000);
}

export async function getSellerProfile(userId: string) {
  return prisma.sellerProfile.findUnique({ where: { userId } });
}

/** Count listings that occupy a seller's active quota. */
export async function activeListingCount(userId: string): Promise<number> {
  return prisma.project.count({
    where: { ownerId: userId, listingSource: "SELLER", listingStatus: { in: [...ACTIVE_LISTING_STATUSES] } },
  });
}

export async function logListingActivity(
  projectId: string,
  eventType: ListingEventType,
  actor: { id?: string | null; role?: "SELLER" | "ADMIN" | "SYSTEM" },
  detail?: string,
) {
  await prisma.listingActivity.create({
    data: { projectId, eventType, actorId: actor.id ?? null, actorRole: actor.role ?? null, detail: detail ?? null },
  });
}

/** True when the seller must supply an owner-authorisation document. */
export function needsAuthorisationDoc(sellerType: string | null | undefined): boolean {
  return sellerType === "AGENT" || sellerType === "BUILDER";
}

/** RERA agent number is required for AGENT / BUILDER onboarding. */
export function reraAgentRequired(sellerType: string): boolean {
  return sellerType === "AGENT" || sellerType === "BUILDER";
}

// Status pill metadata used by the seller UI.
export const STATUS_META: Record<string, { label: string; tone: "grey" | "amber" | "alert" | "green" | "navy" }> = {
  DRAFT: { label: "Draft", tone: "grey" },
  PENDING_REVIEW: { label: "Pending review", tone: "amber" },
  CHANGES_REQUESTED: { label: "Changes requested", tone: "alert" },
  APPROVED: { label: "Live", tone: "green" },
  PAUSED: { label: "Paused", tone: "grey" },
  EXPIRED: { label: "Expired", tone: "grey" },
  SOLD: { label: "Sold", tone: "navy" },
  REJECTED: { label: "Rejected", tone: "alert" },
};
