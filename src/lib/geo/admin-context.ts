/**
 * Historical admin context (AGENTS.md geo spec, Part 2.3).
 *
 * Boundaries were reorganised twice recently (TG 2016: 10->33 districts,
 * AP 2022: 13->26). A 2019 registration record from "Mahbubnagar district"
 * refers to a different area than 2026's Mahbubnagar. Every historical query in
 * downstream modules MUST resolve district/mandal through this function so it
 * reports the admin unit as of the record's date, not today's.
 */

import prisma from '../prisma';

export interface AdminContext {
  districtLgd: string;
  districtName: string;
  mandalLgd: string;
  mandalName: string;
  effectiveFrom: Date;
  effectiveTo: Date | null;
}

/**
 * The district/mandal a village belonged to on `asOfDate` (default: now).
 * Falls back to the village's current mandal/district when no history row
 * covers the date (i.e. the boundaries never changed for this village).
 */
export async function getAdminContext(villageId: string, asOfDate: Date = new Date()): Promise<AdminContext | null> {
  const history = await prisma.adminBoundaryHistory.findMany({
    where: {
      villageId,
      effectiveFrom: { lte: asOfDate },
      OR: [{ effectiveTo: null }, { effectiveTo: { gt: asOfDate } }],
    },
    orderBy: { effectiveFrom: 'desc' },
    take: 1,
  });

  if (history.length > 0) {
    const h = history[0];
    return {
      districtLgd: h.districtLgd,
      districtName: h.districtName,
      mandalLgd: h.mandalLgd,
      mandalName: h.mandalName,
      effectiveFrom: h.effectiveFrom,
      effectiveTo: h.effectiveTo,
    };
  }

  // No history — report current placement.
  const village = await prisma.revenueVillage.findUnique({
    where: { id: villageId },
    select: { mandal: { select: { lgdCode: true, name: true, district: { select: { lgdCode: true, name: true } } } } },
  });
  if (!village) return null;
  return {
    districtLgd: village.mandal.district.lgdCode,
    districtName: village.mandal.district.name,
    mandalLgd: village.mandal.lgdCode,
    mandalName: village.mandal.name,
    effectiveFrom: new Date(0),
    effectiveTo: null,
  };
}
