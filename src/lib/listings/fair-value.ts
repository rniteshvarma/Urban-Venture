// Fair value for a seller listing. Reuses the EXISTING CorridorProfile price
// data, in the listing's own unit: plot prices per sq.yd for land, apartment
// prices per sq.ft for apartments. There is no model rate for villas or
// commercial space, so those get none. Village-level pricing is not modelled
// yet, so we resolve the village's dominant corridor (highest-weight link) and
// fall back to the Project.corridor name. Returns null rates when there is no
// model price — the score engine then marks the price component confidence LOW.

import prisma from "@/lib/prisma";
import { areaUnitFor, type AreaUnit } from "./units";

export interface FairValue {
  corridorName: string | null;
  /** Unit of the rates below: ₹ per sq.yd (land) or per sq.ft (built property). */
  unit: AreaUnit;
  p10: number | null; // min
  p50: number | null; // mid
  p90: number | null; // max
}

const empty = (unit: AreaUnit, corridorName: string | null = null): FairValue => ({ corridorName, unit, p10: null, p50: null, p90: null });
const midOf = (min: number | null, mid: number | null, max: number | null) => mid ?? (min != null && max != null ? (min + max) / 2 : null);

function fromProfile(
  cp: {
    name: string;
    plotPriceMinSqYd: number | null;
    plotPriceMidSqYd: number | null;
    plotPriceMaxSqYd: number | null;
    aptPriceMinSqFt: number | null;
    aptPriceMaxSqFt: number | null;
  },
  propertyType: string | null | undefined,
): FairValue {
  const unit = areaUnitFor(propertyType);
  if (unit === "SQYD") {
    return { corridorName: cp.name, unit, p10: cp.plotPriceMinSqYd ?? null, p50: midOf(cp.plotPriceMinSqYd, cp.plotPriceMidSqYd, cp.plotPriceMaxSqYd), p90: cp.plotPriceMaxSqYd ?? null };
  }
  // Built property: only apartments have a modelled rate.
  if (!/apartment|flat/i.test(propertyType ?? "")) return empty(unit, cp.name);
  return { corridorName: cp.name, unit, p10: cp.aptPriceMinSqFt ?? null, p50: midOf(cp.aptPriceMinSqFt, null, cp.aptPriceMaxSqFt), p90: cp.aptPriceMaxSqFt ?? null };
}

/** Fair value for a village, via its dominant corridor. */
export async function fairValueForVillage(villageId: string, propertyType?: string | null): Promise<FairValue> {
  const link = await prisma.corridorVillage.findFirst({
    where: { villageId },
    orderBy: { weight: "desc" },
  });
  if (!link) return empty(areaUnitFor(propertyType));
  const cp = await prisma.corridorProfile.findUnique({ where: { slug: link.corridorSlug } });
  return cp ? fromProfile(cp, propertyType) : empty(areaUnitFor(propertyType));
}

/** Fair value by corridor name or shortName (fallback when no village link). */
export async function fairValueForCorridorName(corridor: string, propertyType?: string | null): Promise<FairValue> {
  const cp = await prisma.corridorProfile.findFirst({
    where: { OR: [{ name: corridor }, { shortName: corridor }, { slug: corridor.toLowerCase() }] },
  });
  return cp ? fromProfile(cp, propertyType) : empty(areaUnitFor(propertyType));
}

/** Resolve fair value for a listing: prefer village link, else corridor name. */
export async function fairValueForListing(input: { villageId?: string | null; corridor?: string | null; propertyType?: string | null }): Promise<FairValue> {
  if (input.villageId) {
    const fv = await fairValueForVillage(input.villageId, input.propertyType);
    if (fv.p50 != null) return fv;
  }
  if (input.corridor) return fairValueForCorridorName(input.corridor, input.propertyType);
  return empty(areaUnitFor(input.propertyType));
}
