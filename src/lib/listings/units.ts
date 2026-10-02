/**
 * Area units by property type. Land is measured in square yards; built
 * property (apartments, villas, commercial space) in square feet. A "villa
 * plot" or "commercial plot" is land, so it stays in square yards.
 */
export type AreaUnit = "SQFT" | "SQYD";

export const UNIT_LABEL: Record<AreaUnit, string> = { SQFT: "sq.ft", SQYD: "sq.yd" };

const LAND = /plot|land/i;
const BUILT = /apartment|flat|villa|house|commercial|office|shop|retail/i;

export function areaUnitFor(propertyType: string | null | undefined): AreaUnit {
  const t = propertyType ?? "";
  if (LAND.test(t)) return "SQYD";
  return BUILT.test(t) ? "SQFT" : "SQYD";
}

/** The listing's total area in the unit its property type is measured in. */
export function listingArea(p: {
  propertyType?: string | null;
  totalAreaSqYd?: number | null;
  totalAreaSqFt?: number | null;
}): { value: number | null; unit: AreaUnit } {
  const unit = areaUnitFor(p.propertyType);
  const raw = unit === "SQFT" ? p.totalAreaSqFt : p.totalAreaSqYd;
  return { value: raw != null && raw > 0 ? raw : null, unit };
}

/** ₹ per area unit from a total price in lakhs (null when either is missing). */
export function ratePerUnit(priceLakh: number | null | undefined, area: number | null): number | null {
  return area && area > 0 && priceLakh && priceLakh > 0 ? Math.round((priceLakh * 100_000) / area) : null;
}
