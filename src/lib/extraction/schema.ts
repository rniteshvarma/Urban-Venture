/**
 * Zod contract for the Stage 5 extraction JSON (Brochure Ingestion + image
 * addendum). Every extracted field is confidence-wrapped: { value, page,
 * snippet, confidence }. Parsing is tolerant — AI output is messy — but shapes
 * the result so downstream code (normalisation, draft creation) is safe.
 */

import { z } from 'zod';

/** A confidence-wrapped field. `value` may be null; confidence coerces to [0,1]. */
function field<T extends z.ZodTypeAny>(inner: T) {
  return z
    .object({
      value: inner.nullable().catch(null),
      page: z.number().int().nullable().optional().catch(null),
      snippet: z.string().nullable().optional().catch(null),
      confidence: z.coerce.number().min(0).max(1).catch(0),
    })
    .catch({ value: null, page: null, snippet: null, confidence: 0 } as never);
}

const str = () => field(z.string());
const num = () => field(z.number());

const projectSchema = z
  .object({
    name: str(),
    developer: str(),
    propertyType: str(), // APARTMENT|PLOT|VILLA|ROWHOUSE|COMMERCIAL|MIXED — coerced later
    addressLine: str(),
    locality: str(),
    city: str(),
    landmark: str(),
    reraNumber: str(),
    totalLandAcres: num(),
    totalUnits: num(),
    towerCount: num(),
    floorsPerTower: str(),
    openSpacePct: num(),
    possessionText: str(),
    description: str(),
  })
  .partial()
  .passthrough();

const unitTypeSchema = z
  .object({
    label: str(),
    unitCategory: str(), // coerced to UnitCategory later
    bedrooms: num(),
    bathrooms: num(),
    areaValue: num(),
    areaUnit: str(), // coerced to AreaUnit later
    carpetArea: num(),
    priceValue: num(),
    priceUnit: str(), // TOTAL_RUPEES|TOTAL_LAKH|TOTAL_CRORE|PER_SQFT|PER_SQYD
    priceNote: str(),
    facing: str(),
    availableUnits: num(),
  })
  .partial()
  .passthrough();

const documentQualitySchema = z
  .object({
    isBrochure: z.boolean().catch(true),
    legibility: z.enum(['GOOD', 'FAIR', 'POOR']).catch('FAIR'),
    concerns: z.array(z.string()).catch([]),
    // Image-addendum extensions:
    illegibleRegions: z
      .array(
        z.object({
          page: z.number().int().nullable().catch(null),
          description: z.string().catch(''),
          reason: z.string().catch(''),
        }),
      )
      .catch([]),
    multipleProjectsDetected: z.boolean().catch(false),
  })
  .partial()
  .passthrough();

export const extractionSchema = z
  .object({
    project: projectSchema.optional(),
    unitTypes: z.array(unitTypeSchema).catch([]),
    amenities: field(z.array(z.string())).optional(),
    specifications: field(z.record(z.string(), z.string())).optional(),
    paymentPlan: field(
      z.array(z.object({ milestone: z.string().catch(''), percentage: z.number().nullable().catch(null), amount: z.number().nullable().catch(null) })),
    ).optional(),
    approvals: field(z.array(z.string())).optional(),
    coordinates: field(z.object({ lat: z.number(), lng: z.number() })).optional(),
    pageRoles: z.array(z.object({ page: z.number().int(), role: z.string() })).catch([]),
    documentQuality: documentQualitySchema.optional(),
  })
  .passthrough();

export type ExtractionResult = z.infer<typeof extractionSchema>;

export interface ParseOutcome {
  ok: boolean;
  data?: ExtractionResult;
  error?: string;
}

/** Tolerantly parse Claude's JSON output. Strips ```json fences if present. */
export function parseExtraction(raw: string | object): ParseOutcome {
  let obj: unknown = raw;
  if (typeof raw === 'string') {
    const cleaned = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    try {
      obj = JSON.parse(cleaned);
    } catch (e) {
      return { ok: false, error: `Invalid JSON: ${e instanceof Error ? e.message : String(e)}` };
    }
  }
  const result = extractionSchema.safeParse(obj);
  if (!result.success) return { ok: false, error: result.error.message };
  return { ok: true, data: result.data };
}

/** Count extracted vs low-confidence fields for the job summary. */
export function summariseConfidence(data: ExtractionResult): { extracted: number; lowConfidence: number; overall: number } {
  const confidences: number[] = [];
  const walk = (v: unknown) => {
    if (v && typeof v === 'object') {
      if ('confidence' in v && 'value' in v) {
        const f = v as { value: unknown; confidence: number };
        if (f.value !== null && f.value !== undefined) confidences.push(f.confidence);
      } else {
        for (const val of Object.values(v)) walk(val);
      }
    }
  };
  walk(data);
  const extracted = confidences.length;
  const lowConfidence = confidences.filter((c) => c < 0.6).length;
  const overall = extracted ? confidences.reduce((a, b) => a + b, 0) / extracted : 0;
  return { extracted, lowConfidence, overall: Math.round(overall * 100) / 100 };
}
