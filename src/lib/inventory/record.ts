/**
 * The shape of one inventory record in prisma/data/hyderabad-inventory.json,
 * shared by the source parsers (src/lib/inventory/sources/*) and the loader
 * (scripts/inventory/seed-inventory.ts), plus the plain-language description
 * every record carries.
 */
export type InventoryType = "Apartment" | "Villa" | "Plots" | "Commercial" | "Land";
export type UnitCategory = "APARTMENT" | "VILLA" | "PLOT" | "COMMERCIAL" | "OFFICE" | "LAND";

export interface InventoryUnit {
  label: string;
  category: UnitCategory;
  bedrooms: number | null;
  carpetSqFt: number | null;
  builtUpSqFt: number | null;
  plotSqYd: number | null;
  /** Land listings: area in acres (plotSqYd carries the same area in sq.yd) */
  acres?: number | null;
  priceLakh: number | null;
  ratePerSqFt?: number | null;
  ratePerSqYd?: number | null;
  ratePerAcreLakh?: number | null;
  priceNote?: string | null;
}

export interface InventoryRecord {
  key: string;
  name: string;
  developer: string;
  developerEstablished: number | null;
  propertyType: InventoryType;
  /** "PROJECT": a RERA-registered development. "LAND_LISTING": an individual land/plot sale (not RERA). */
  listingKind?: "PROJECT" | "LAND_LISTING";
  locality: string;
  subLocality: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  coordPrecision: "exact" | "approximate" | null;
  reraNumbers: string[];
  reraUrl: string | null;
  landAcres: number | null;
  towers: number | null;
  floors: string | null;
  plots: number | null;
  totalUnits: number | null;
  possessionRera: string | null;
  possessionTarget: string | null;
  status: "READY" | "UNDER_CONSTRUCTION" | "UNKNOWN";
  priceMinLakh: number;
  priceMaxLakh: number;
  units: InventoryUnit[];
  amenities: string[];
  images: string[];
  masterPlans: string[];
  floorPlans: string[];
  paymentPlans: string[];
  landmarks: { name: string; km: number }[];
  litigation: string | null;
  approvals: string[];
  sources: { name: string; url: string; accessed: string }[];
  flags: string[];
  description: string;
  /** Land listings: when the source listed it, and what the source checked */
  postedAt?: string | null;
  sourceVerification?: string | null;
}

/** ₹ in lakh → "₹89.42 L" / "₹1.45 Cr" */
export function lakhLabel(l: number): string {
  if (l >= 100) return `₹${Number((l / 100).toFixed(2))} Cr`;
  return `₹${Number(l.toFixed(2))} L`;
}

const n = (x: number) => Math.round(x).toLocaleString("en-IN");
const KIND: Record<InventoryType, string> = { Apartment: "apartment", Villa: "villa", Plots: "plotted", Commercial: "commercial", Land: "land" };

/** The record's description, built only from its own fields. */
export function describe(r: Omit<InventoryRecord, "description">): string {
  const parts: string[] = [];
  const dev = `${r.developer}${r.developerEstablished ? ` (est. ${r.developerEstablished})` : ""}`;
  if (r.listingKind === "LAND_LISTING") {
    const where = `${r.locality}${r.subLocality && r.subLocality !== r.locality ? ` (${r.subLocality})` : ""}`;
    const site = r.sources[0]?.name ?? "a land marketplace";
    const sqyd = r.units[0]?.plotSqYd;
    if (r.propertyType === "Plots" && sqyd) parts.push(`A ${n(sqyd)} sq.yd plot for sale in ${where}, listed on ${site}.`);
    else {
      const acres = r.landAcres != null ? `${Number(r.landAcres.toFixed(2))} acre${r.landAcres === 1 ? "" : "s"}` : "Land";
      parts.push(`${acres} of land for sale in ${where}, listed on ${site}.`);
    }
    const u = r.units[0];
    if (u?.ratePerAcreLakh) parts.push(`Asking ${lakhLabel(r.priceMinLakh)} in total (${lakhLabel(u.ratePerAcreLakh)} per acre).`);
    else parts.push(`Asking ${lakhLabel(r.priceMinLakh)}.`);
    parts.push("This is an individual land listing, not a RERA-registered project: check the title, land records and conversion status before paying.");
    return parts.join(" ");
  }
  parts.push(`${r.name} is a RERA-registered ${KIND[r.propertyType]} project by ${dev} in ${r.locality}, Hyderabad.`);
  const spread = [
    r.landAcres ? `Spread over ${Number(r.landAcres.toFixed(2))} acres` : null,
    r.towers && r.propertyType !== "Plots" ? `${r.towers} tower${r.towers === 1 ? "" : "s"}${r.floors ? ` (${r.floors})` : ""}` : null,
    r.propertyType === "Plots" ? (r.plots ?? r.totalUnits) ? `${r.plots ?? r.totalUnits} plots` : null : r.totalUnits ? `${r.totalUnits} units` : null,
  ].filter(Boolean);
  if (spread.length) parts.push(`${spread.join(", ")}.`);
  if (r.propertyType === "Plots") {
    const s = r.units.map((u) => u.plotSqYd).filter((x): x is number => !!x);
    if (s.length) parts.push(`Plot sizes from ${n(Math.min(...s))} to ${n(Math.max(...s))} sq.yd.`);
  } else {
    const s = r.units.map((u) => u.builtUpSqFt ?? u.carpetSqFt).filter((x): x is number => !!x);
    const bhk = [...new Set(r.units.map((u) => u.label).filter((l) => /BHK/i.test(l)))];
    if (s.length) parts.push(`${bhk.length ? `Offers ${bhk.join(", ")} homes` : `Units`} from ${n(Math.min(...s))} to ${n(Math.max(...s))} sq.ft.`);
  }
  if (r.priceMinLakh > 0) parts.push(`Listed base prices ${lakhLabel(r.priceMinLakh)}${r.priceMaxLakh > r.priceMinLakh ? ` – ${lakhLabel(r.priceMaxLakh)}` : ""}.`);
  if (r.status === "READY") parts.push("Ready to move.");
  else if (r.possessionRera || r.possessionTarget) {
    const d = new Date(r.possessionRera ?? r.possessionTarget!);
    parts.push(`Expected possession: ${d.toLocaleString("en-IN", { month: "short", year: "numeric", timeZone: "UTC" })}.`);
  }
  if (r.address) parts.push(`Address: ${r.address.replace(/\.$/, "")}.`);
  return parts.join(" ");
}
