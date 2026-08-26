// Shared helpers for Seller Mode API routes.
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";

export type SellerAuth =
  | { ok: true; userId: string; profile: NonNullable<Awaited<ReturnType<typeof loadProfile>>> }
  | { ok: false; res: NextResponse };

function loadProfile(userId: string) {
  return prisma.sellerProfile.findUnique({ where: { userId } });
}

/** Require a signed-in user who has completed seller onboarding. */
export async function requireSeller(): Promise<SellerAuth> {
  const userId = await getSessionUserId();
  if (!userId) return { ok: false, res: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const profile = await loadProfile(userId);
  if (!profile) return { ok: false, res: NextResponse.json({ error: "Seller onboarding required", code: "NO_SELLER_PROFILE" }, { status: 403 }) };
  return { ok: true, userId, profile };
}

/** Load a project that the given user owns as a seller listing, or null. */
export async function ownedListing(userId: string, projectId: string) {
  return prisma.project.findFirst({ where: { id: projectId, ownerId: userId, listingSource: "SELLER" } });
}
