// POST /api/seller/matches/[id]/request-connect — seller asks our team to
// connect with an anonymised matched buyer. Creates an internal task
// (ListingActivity) for the assigned agent. No buyer contact is exposed.
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireSeller } from "@/lib/listings/api";
import { logListingActivity } from "@/lib/listings/seller";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireSeller();
  if (!auth.ok) return auth.res;
  const { id } = await ctx.params;

  const match = await prisma.projectLeadMatch.findFirst({
    where: { id, project: { ownerId: auth.userId, listingSource: "SELLER" } },
    include: { project: { select: { id: true } } },
  });
  if (!match) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await logListingActivity(match.project.id, "EDITED", { id: auth.userId, role: "SELLER" }, `Connect requested for matched buyer (match ${match.id}, score ${match.matchScore})`);
  return NextResponse.json({ ok: true, message: "Our advisor will qualify this buyer and coordinate an introduction." });
}
