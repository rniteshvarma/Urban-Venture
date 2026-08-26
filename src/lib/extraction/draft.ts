/**
 * Stage 9 — create a DRAFT Project from a parsed extraction. Applies the tested
 * normalisers, records a ProjectFieldAudit for every extracted field (provenance
 * kept even after correction), and attaches uploaded images as private media.
 * Never publishes.
 */

import type { AreaUnit as PrismaAreaUnit, ProjectMedia, UnitCategory } from '@prisma/client';
import prisma from '../prisma';
import { convertArea, parseAreaUnit, type AreaUnit } from './normalise';
import type { ExtractionResult } from './schema';

type Field<T> = { value: T | null; page?: number | null; snippet?: string | null; confidence?: number } | undefined;
const val = <T>(f: Field<T>): T | null => (f ? f.value : null);
const cf = (f: Field<unknown>): number => (f?.confidence ?? 0);

const PROP_TYPE: Record<string, string> = {
  APARTMENT: 'Apartment', PLOT: 'Plots', VILLA: 'Villa', ROWHOUSE: 'Rowhouse', COMMERCIAL: 'Commercial', MIXED: 'Mixed',
};
const UNIT_CATS = new Set(['APARTMENT', 'PLOT', 'VILLA', 'ROWHOUSE', 'COMMERCIAL', 'OFFICE', 'OTHER']);

function normalisePrice(priceValue: number | null, priceUnit: string | null, areaSqFt: number | null): { priceLakh?: number; priceValue?: number; ratePerSqFt?: number; ratePerSqYd?: number } {
  if (priceValue == null) return {};
  switch ((priceUnit ?? '').toUpperCase()) {
    case 'TOTAL_CRORE': return { priceLakh: priceValue * 100, priceValue: Math.round(priceValue * 1e7) };
    case 'TOTAL_LAKH': return { priceLakh: priceValue, priceValue: Math.round(priceValue * 1e5) };
    case 'TOTAL_RUPEES': return { priceLakh: Math.round((priceValue / 1e5) * 100) / 100, priceValue: Math.round(priceValue) };
    case 'PER_SQFT': return { ratePerSqFt: priceValue, ...(areaSqFt ? { priceLakh: Math.round((priceValue * areaSqFt / 1e5) * 100) / 100 } : {}) };
    case 'PER_SQYD': return { ratePerSqYd: priceValue, ...(areaSqFt ? { priceLakh: Math.round((priceValue * (areaSqFt / 9) / 1e5) * 100) / 100 } : {}) };
    default: return { priceValue };
  }
}

export async function createDraftFromExtraction(
  job: { id: string; sourceFormat: string },
  ex: ExtractionResult,
  opts: { hintCorridor?: string; media?: Array<{ fileUrl: string; mimeType: string; fileSizeKb: number; declaredRole?: string | null; isScreenshot?: boolean }> },
): Promise<{ projectId: string; needsAttention: boolean }> {
  const p = ex.project ?? {};
  const name = val(p.name as Field<string>) ?? 'Untitled (extracted)';
  const propType = PROP_TYPE[(val(p.propertyType as Field<string>) ?? '').toUpperCase()] ?? 'Residential';

  // Normalise unit types first so we can derive the project budget band.
  const units = (ex.unitTypes ?? []).map((u) => {
    const areaValue = val(u.areaValue as Field<number>);
    const unit = parseAreaUnit(val(u.areaUnit as Field<string>)) as AreaUnit | null;
    const area = areaValue != null && unit ? convertArea(areaValue, unit) : null;
    const price = normalisePrice(val(u.priceValue as Field<number>), val(u.priceUnit as Field<string>), area?.sqFt ?? null);
    const confidence = Math.min(cf(u.label as Field<unknown>) || 1, cf(u.priceValue as Field<unknown>) || 1);
    return {
      label: val(u.label as Field<string>) ?? 'Unit',
      unitCategory: (UNIT_CATS.has((val(u.unitCategory as Field<string>) ?? '').toUpperCase()) ? (val(u.unitCategory as Field<string>) as string).toUpperCase() : 'OTHER') as UnitCategory,
      bedrooms: val(u.bedrooms as Field<number>),
      bathrooms: val(u.bathrooms as Field<number>),
      areaValue,
      areaUnit: (unit ?? null) as PrismaAreaUnit | null,
      areaSqFt: area?.sqFt ?? null,
      areaSqYd: area?.sqYd ?? null,
      carpetAreaSqFt: val(u.carpetArea as Field<number>),
      priceValue: price.priceValue ?? null,
      priceLakh: price.priceLakh ?? null,
      ratePerSqFt: price.ratePerSqFt ?? null,
      ratePerSqYd: price.ratePerSqYd ?? null,
      priceNote: val(u.priceNote as Field<string>),
      facing: val(u.facing as Field<string>),
      availableUnits: val(u.availableUnits as Field<number>),
      confidence,
      sourcePage: (u.priceValue as Field<number>)?.page ?? (u.label as Field<string>)?.page ?? null,
      sourceSnippet: (u.priceValue as Field<number>)?.snippet ?? null,
    };
  });

  const lakhs = units.map((u) => u.priceLakh).filter((n): n is number => n != null && n > 0);
  const minBudgetLakhs = lakhs.length ? Math.min(...lakhs) : 0;
  const maxBudgetLakhs = lakhs.length ? Math.max(...lakhs) : 0;

  // ERROR conditions → NEEDS_ATTENTION (spec Stage 8/9).
  const lowConf = units.filter((u) => u.confidence < 0.6).length;
  const isBrochure = ex.documentQuality?.isBrochure !== false;
  const needsAttention = !isBrochure || (units.length === 0 && lakhs.length === 0) || lowConf > 5 || !val(p.name as Field<string>);

  const project = await prisma.project.create({
    data: {
      name,
      developer: val(p.developer as Field<string>) ?? 'Unknown',
      corridor: opts.hintCorridor || val(p.locality as Field<string>) || 'Unknown',
      city: val(p.city as Field<string>) ?? 'Hyderabad',
      minBudgetLakhs,
      maxBudgetLakhs,
      minHorizonYears: 3,
      maxHorizonYears: 7,
      riskLevel: 'MEDIUM',
      propertyType: propType,
      description: val(p.description as Field<string>) ?? '',
      status: 'UPCOMING',
      reviewState: needsAttention ? 'NEEDS_ATTENTION' : 'DRAFT',
      sourceType: job.sourceFormat === 'PDF' ? 'BROCHURE_PDF' : 'BROCHURE_IMAGES',
      extractionJobId: job.id,
      reraNumber: val(p.reraNumber as Field<string>),
      possessionText: val(p.possessionText as Field<string>),
      totalLandAcres: val(p.totalLandAcres as Field<number>),
      totalUnits: val(p.totalUnits as Field<number>),
      towerCount: val(p.towerCount as Field<number>),
      floorsPerTower: val(p.floorsPerTower as Field<string>),
      openSpacePct: val(p.openSpacePct as Field<number>),
      addressLine: val(p.addressLine as Field<string>),
      landmark: val(p.landmark as Field<string>),
      amenities: val(ex.amenities as Field<string[]>) ?? [],
      approvals: val(ex.approvals as Field<string[]>) ?? [],
      specifications: (val(ex.specifications as Field<object>) ?? undefined) as object | undefined,
      paymentPlan: (val(ex.paymentPlan as Field<object>) ?? undefined) as object | undefined,
    },
  });

  if (units.length) {
    await prisma.projectUnitType.createMany({
      data: units.map((u, i) => ({ ...u, projectId: project.id, displayOrder: i })),
    });
  }

  // Field audits for the project scalars (provenance).
  const auditFields: Array<[string, Field<unknown>]> = [
    ['name', p.name as Field<unknown>], ['developer', p.developer as Field<unknown>], ['reraNumber', p.reraNumber as Field<unknown>],
    ['city', p.city as Field<unknown>], ['possessionText', p.possessionText as Field<unknown>], ['totalUnits', p.totalUnits as Field<unknown>],
  ];
  await prisma.projectFieldAudit.createMany({
    data: auditFields
      .filter(([, f]) => f && f.value != null)
      .map(([path, f]) => ({
        projectId: project.id, jobId: job.id, fieldPath: path,
        extractedValue: String(f!.value), finalValue: String(f!.value),
        confidence: f!.confidence ?? 0, sourcePage: f!.page ?? null, sourceSnippet: f!.snippet ?? null,
      })),
  });

  // Uploaded images become private media candidates (rights UNVERIFIED).
  if (opts.media?.length) {
    await prisma.projectMedia.createMany({
      data: opts.media.map((m, i) => ({
        projectId: project.id, jobId: job.id, fileUrl: m.fileUrl, mimeType: m.mimeType, fileSizeKb: m.fileSizeKb,
        mediaType: (m.declaredRole === 'MASTER_PLAN' ? 'MASTER_PLAN' : m.declaredRole === 'FLOOR_PLAN' ? 'FLOOR_PLAN' : m.declaredRole === 'PRICE_LIST' ? 'PRICE_TABLE' : 'UNKNOWN'),
        extractMethod: 'DIRECT_UPLOAD', rightsStatus: 'UNVERIFIED', isPublic: false,
        isRejected: !!m.isScreenshot, displayOrder: i,
      })) as Omit<ProjectMedia, 'id' | 'createdAt'>[],
    });
  }

  await prisma.project.update({ where: { id: project.id }, data: { totalUnits: project.totalUnits ?? (units.length || null) } });
  return { projectId: project.id, needsAttention };
}
