// Fair value for a seller listing. Reuses the EXISTING CorridorProfile plot
// price data (min / mid / max per sq.yd). Village-level pricing is not modelled
// yet, so we resolve the village's dominant corridor (highest-weight link) and
// fall back to the Project.corridor name. Returns null rates when there is no
// model price — the score engine then marks the price component confidence LOW.

import prisma from "@/lib/prisma";

export interface FairValue {
  corridorName: string | null;
  p10PerSqYd: number | null; // min
  p50PerSqYd: number | null; // mid
  p90PerSqYd: number | null; // max
}

const EMPTY: FairValue = { corridorName: null, p10PerSqYd: null, p50PerSqYd: null, p90PerSqYd: null };

function fromProfile(cp: {
  name: string;
  plotPriceMinSqYd: number | null;
  plotPriceMidSqYd: number | null;
  plotPriceMaxSqYd: number | null;
}): FairValue {
  const mid = cp.plotPriceMidSqYd ?? (cp.plotPriceMinSqYd != null && cp.plotPriceMaxSqYd != null ? (cp.plotPriceMinSqYd + cp.plotPriceMaxSqYd) / 2 : null);
  return {
    corridorName: cp.name,
    p10PerSqYd: cp.plotPriceMinSqYd ?? null,
    p50PerSqYd: mid,
    p90PerSqYd: cp.plotPriceMaxSqYd ?? null,
  };
}

/** Fair value for a village, via its dominant corridor. */
export async function fairValueForVillage(villageId: string): Promise<FairValue> {
  const link = await prisma.corridorVillage.findFirst({
    where: { villageId },
    orderBy: { weight: "desc" },
  });
  if (!link) return EMPTY;
  const cp = await prisma.corridorProfile.findUnique({ where: { slug: link.corridorSlug } });
  return cp ? fromProfile(cp) : EMPTY;
}

/** Fair value by corridor name or shortName (fallback when no village link). */
export async function fairValueForCorridorName(corridor: string): Promise<FairValue> {
  const cp = await prisma.corridorProfile.findFirst({
    where: { OR: [{ name: corridor }, { shortName: corridor }, { slug: corridor.toLowerCase() }] },
  });
  return cp ? fromProfile(cp) : EMPTY;
}

/** Resolve fair value for a listing: prefer village link, else corridor name. */
export async function fairValueForListing(input: { villageId?: string | null; corridor?: string | null }): Promise<FairValue> {
  if (input.villageId) {
    const fv = await fairValueForVillage(input.villageId);
    if (fv.p50PerSqYd != null) return fv;
  }
  if (input.corridor) return fairValueForCorridorName(input.corridor);
  return EMPTY;
}
