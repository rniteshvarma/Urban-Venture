// GET /api/seller/matches — buyers matched to the seller's live listings.
// Reads the EXISTING ProjectLeadMatch engine output. No new matching logic.
// Fully anonymised: no buyer name or contact ever leaves this endpoint.
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireSeller } from "@/lib/listings/api";

const MIN_MATCH = 60;

export async function GET() {
  const auth = await requireSeller();
  if (!auth.ok) return auth.res;

  const matches = await prisma.projectLeadMatch.findMany({
    where: {
      isDismissed: false,
      matchScore: { gte: MIN_MATCH },
      project: { ownerId: auth.userId, listingSource: "SELLER", listingStatus: "APPROVED" },
    },
    orderBy: { matchScore: "desc" },
    include: {
      project: { select: { id: true, name: true, corridor: true } },
      lead: { select: { budget: true, horizon: true, persona: true, createdAt: true, city: true } },
    },
  });

  const items = matches.map((m) => ({
    id: m.id,
    matchScore: m.matchScore,
    forListing: { id: m.project.id, name: m.project.name, corridor: m.project.corridor },
    budgetLakh: m.lead.budget,
    horizonYears: m.lead.horizon,
    persona: m.lead.persona,
    searchingSince: m.lead.createdAt.toISOString(),
    // Anonymised interest signal: the matched corridor + the buyer's city
    interestedCorridors: Array.from(new Set([m.project.corridor, m.lead.city].filter(Boolean))),
    reasons: m.matchReasons,
  }));

  return NextResponse.json({ matches: items });
}
