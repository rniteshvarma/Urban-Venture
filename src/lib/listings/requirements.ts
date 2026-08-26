// Per-property-type field requirements, draft completion %, and the publish
// blockers. Saving never validates; publishing (submit) always does — these
// functions power the submit gate (Part 5) and the draft completion bar.

export type PropertyKind = "plot" | "land" | "built";

export function propertyKind(propertyType: string | null | undefined): PropertyKind {
  const t = (propertyType ?? "").toLowerCase();
  if (t.includes("plot")) return "plot";
  if (t.includes("land") || t.includes("agri")) return "land";
  return "built"; // apartment / villa / commercial / rowhouse
}

/** Shape of the listing fields the requirement checks read. */
export interface ListingFields {
  propertyType: string | null;
  villageId: string | null;
  surveyNumbers: string[];
  pinInsideVillage: boolean | null;
  latitude: number | null;
  longitude: number | null;
  totalAreaSqYd: number | null;
  totalPlots: number | null;
  availablePlots: number | null;
  plotSizesSqYd: number[];
  ownershipType: string | null;
  landClassification: string | null;
  approvalStatus: string | null;
  minBudgetLakhs: number | null;
  maxBudgetLakhs: number | null;
  description: string | null;
  photoCount: number;
  hasLayoutOrFloorPlan: boolean;
}

interface Req {
  key: string;
  label: string;
  ok: (f: ListingFields) => boolean;
  /** kinds this requirement applies to; omit = all */
  kinds?: PropertyKind[];
}

const REQUIREMENTS: Req[] = [
  { key: "propertyType", label: "Property type", ok: (f) => !!f.propertyType },
  { key: "village", label: "Village / location", ok: (f) => !!f.villageId },
  { key: "survey", label: "Survey number(s)", ok: (f) => f.surveyNumbers.length > 0 },
  { key: "pin", label: "Map pin", ok: (f) => f.latitude != null && f.longitude != null },
  { key: "area", label: "Total area", ok: (f) => !!f.totalAreaSqYd && f.totalAreaSqYd > 0 },
  { key: "plots", label: "Plot count & sizes", ok: (f) => (f.totalPlots ?? 0) > 0 || f.plotSizesSqYd.length > 0, kinds: ["plot"] },
  { key: "ownership", label: "Ownership type", ok: (f) => !!f.ownershipType },
  { key: "approval", label: "Approval status", ok: (f) => !!f.approvalStatus },
  { key: "price", label: "Price", ok: (f) => (f.maxBudgetLakhs ?? f.minBudgetLakhs ?? 0) > 0 },
  { key: "description", label: "Description (200+ chars)", ok: (f) => (f.description ?? "").length >= 200 },
  { key: "photos", label: "At least 5 photos", ok: (f) => f.photoCount >= 5 },
  { key: "plan", label: "Layout / floor plan", ok: (f) => f.hasLayoutOrFloorPlan },
];

function applicable(f: ListingFields): Req[] {
  const kind = propertyKind(f.propertyType);
  return REQUIREMENTS.filter((r) => !r.kinds || r.kinds.includes(kind));
}

/** 0–100 draft completion, over the type-applicable requirements. */
export function completionPercent(f: ListingFields): number {
  const reqs = applicable(f);
  if (reqs.length === 0) return 0;
  const done = reqs.filter((r) => r.ok(f)).length;
  return Math.round((done / reqs.length) * 100);
}

export interface PublishContext {
  sellerSuspended: boolean;
  activeListingCount: number;
  maxActiveListings: number;
  /** AGENT/BUILDER need an owner-authorisation document on file */
  needsAuthorisationDoc: boolean;
  hasAuthorisationDoc: boolean;
}

/**
 * The hard publish blockers (Part 5). Returns a list of human-readable reasons;
 * empty means the listing may be submitted for review.
 */
export function publishBlockers(f: ListingFields, ctx: PublishContext): string[] {
  const out: string[] = [];
  if (f.surveyNumbers.length === 0) out.push("Add at least one survey number.");
  if (f.pinInsideVillage === false) out.push("Move the map pin inside the selected village boundary.");
  if (f.photoCount < 5) out.push(`Add at least 5 photos (you have ${f.photoCount}).`);
  if (!f.hasLayoutOrFloorPlan) out.push("Upload a layout or floor plan.");
  if (!f.approvalStatus) out.push("Set the approval status (\"Unapproved\" is a valid answer).");
  if (ctx.needsAuthorisationDoc && !ctx.hasAuthorisationDoc) out.push("Upload the owner-authorisation document.");
  if (ctx.sellerSuspended) out.push("Your seller account is suspended — contact support.");
  if (ctx.activeListingCount >= ctx.maxActiveListings) out.push(`You've reached your active listing limit (${ctx.maxActiveListings}).`);
  return out;
}
