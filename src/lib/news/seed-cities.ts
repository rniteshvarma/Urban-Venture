/**
 * News city. Property Tiger covers Hyderabad only; any other city rows from
 * older seeds are switched off by retireOtherCities().
 */

import prisma from '../prisma';

const EXCLUDE = ['cricket', 'film', 'movie', 'election rally', 'weather'];

/** City-specific exclusions — e.g. Hyderabad, Sindh (Pakistan) shares the name. */
const CITY_EXCLUDE: Record<string, string[]> = {
  hyderabad: ['sindh', 'karachi', 'pakistan'],
};

interface SeedCity {
  slug: string;
  name: string;
  stateCode?: string;
  displayOrder: number;
  queryTerms: string[];
  geoLat?: number;
  geoLng?: number;
}

/** Property Tiger covers Hyderabad only (owner's decision, Nov 2026). */
export const SEED_CITIES: SeedCity[] = [
  {
    slug: 'hyderabad', name: 'Hyderabad', stateCode: 'TG', displayOrder: 1, geoLat: 17.385, geoLng: 78.4867,
    queryTerms: ['Hyderabad real estate', 'Telangana land', 'HMDA', 'DTCP Telangana', 'TG RERA', 'Outer Ring Road Hyderabad', 'Regional Ring Road', 'Hyderabad metro', 'Pharma City', 'Future City Telangana', 'GHMC', 'Kokapet', 'Shadnagar', 'Genome Valley', 'TSIIC', 'Hyderabad property registration'],
  },
];
export const NEWS_CITY = 'hyderabad';

/** Switch off any city that isn't in SEED_CITIES (older databases seeded other cities). */
export async function retireOtherCities(): Promise<number> {
  const r = await prisma.newsCity.updateMany({ where: { slug: { notIn: SEED_CITIES.map((c) => c.slug) }, isActive: true }, data: { isActive: false } });
  return r.count;
}

export async function seedCities(): Promise<number> {
  for (const c of SEED_CITIES) {
    await prisma.newsCity.upsert({
      where: { slug: c.slug },
      update: { name: c.name, stateCode: c.stateCode ?? null, displayOrder: c.displayOrder, queryTerms: c.queryTerms, excludeTerms: [...EXCLUDE, ...(CITY_EXCLUDE[c.slug] ?? [])], geoLat: c.geoLat ?? null, geoLng: c.geoLng ?? null, isActive: true },
      create: { slug: c.slug, name: c.name, stateCode: c.stateCode ?? null, displayOrder: c.displayOrder, queryTerms: c.queryTerms, excludeTerms: [...EXCLUDE, ...(CITY_EXCLUDE[c.slug] ?? [])], geoLat: c.geoLat ?? null, geoLng: c.geoLng ?? null, isActive: true },
    });
  }
  return prisma.newsCity.count();
}

/**
 * Bootstrap an empty city table (a fresh database that never ran
 * `npm run news:seed`). Without these rows every refresh is a silent no-op and
 * /news stays empty forever. Create-only, and only when no city exists at all,
 * so admin tuning and deliberately removed cities are never overwritten.
 */
export async function ensureNewsCities(): Promise<void> {
  if ((await prisma.newsCity.count()) > 0) {
    await retireOtherCities();
    return;
  }
  await prisma.newsCity.createMany({
    data: SEED_CITIES.map((c) => ({
      slug: c.slug,
      name: c.name,
      stateCode: c.stateCode ?? null,
      displayOrder: c.displayOrder,
      queryTerms: c.queryTerms,
      excludeTerms: [...EXCLUDE, ...(CITY_EXCLUDE[c.slug] ?? [])],
      geoLat: c.geoLat ?? null,
      geoLng: c.geoLng ?? null,
      isActive: true,
    })),
    skipDuplicates: true,
  });
}
