/**
 * Buyer-fit fields on a listing (what it is, who it's for) — shared by the
 * admin project routes. Untagged listings get sensible defaults derived from
 * the free-text property type, so matching works before anyone edits them.
 */
import { z } from "zod";
import type { BuyerPersona, BuyPurpose, ListingPropertyType, RiskLevel } from "@prisma/client";
import { LISTING_TYPES, PERSONA_KEYS, listingTypesFromText, suggestPersonasForListing } from "./personas";

export const listingFitFields = {
  listingTypes: z.array(z.enum(LISTING_TYPES as [ListingPropertyType, ...ListingPropertyType[]])).optional(),
  purposes: z.array(z.enum(["INVESTMENT", "OWN_USE", "BOTH"])).optional(),
  targetPersonas: z.array(z.enum(PERSONA_KEYS as [BuyerPersona, ...BuyerPersona[]])).optional(),
  expectedRentalYieldPct: z.number().min(0).max(30).nullable().optional(),
};

type FitInput = {
  propertyType?: string;
  listingTypes?: ListingPropertyType[];
  purposes?: BuyPurpose[];
  targetPersonas?: BuyerPersona[];
  minBudgetLakhs?: number;
  maxBudgetLakhs?: number;
  riskLevel?: RiskLevel;
};

/** Fill empty fit fields from what we already know about the listing. */
export function withFitDefaults<T extends FitInput>(data: T, current?: FitInput): T {
  const merged = { ...current, ...data };
  const out: T = { ...data };
  const types = merged.listingTypes?.length ? merged.listingTypes : listingTypesFromText(merged.propertyType);
  if (!merged.listingTypes?.length && types.length) out.listingTypes = types;
  if (!merged.targetPersonas?.length && types.length && merged.minBudgetLakhs != null && merged.maxBudgetLakhs != null) {
    out.targetPersonas = suggestPersonasForListing({
      listingTypes: types,
      purposes: merged.purposes ?? [],
      minBudgetLakhs: merged.minBudgetLakhs,
      maxBudgetLakhs: merged.maxBudgetLakhs,
      riskLevel: merged.riskLevel ?? null,
    });
  }
  return out;
}
