/**
 * Seed cities (News module spec, Part 8). Hyderabad carries the full query set;
 * the others use lighter defaults tuned later via /admin/news/cities.
 */

import prisma from '../prisma';

const EXCLUDE = ['cricket', 'film', 'movie', 'election rally', 'weather'];

interface SeedCity {
  slug: string;
  name: string;
  stateCode?: string;
  displayOrder: number;
  queryTerms: string[];
  geoLat?: number;
  geoLng?: number;
}

export const SEED_CITIES: SeedCity[] = [
  { slug: 'india', name: 'All India', displayOrder: 0, queryTerms: ['India real estate', 'land acquisition', 'RERA', 'NHAI', 'REIT', 'repo rate', 'infrastructure'] },
  {
    slug: 'hyderabad', name: 'Hyderabad', stateCode: 'TG', displayOrder: 1, geoLat: 17.385, geoLng: 78.4867,
    queryTerms: ['Hyderabad real estate', 'Telangana land', 'HMDA', 'DTCP Telangana', 'TG RERA', 'Outer Ring Road Hyderabad', 'Regional Ring Road', 'Hyderabad metro', 'Pharma City', 'Future City Telangana', 'GHMC', 'Kokapet', 'Shadnagar', 'Genome Valley', 'TSIIC', 'Hyderabad property registration'],
  },
  { slug: 'bengaluru', name: 'Bengaluru', stateCode: 'KA', displayOrder: 2, queryTerms: ['Bengaluru real estate', 'Karnataka land', 'BDA', 'BMRDA', 'peripheral ring road', 'Bengaluru metro'] },
  { slug: 'chennai', name: 'Chennai', stateCode: 'TN', displayOrder: 3, queryTerms: ['Chennai real estate', 'Tamil Nadu land', 'CMDA', 'Chennai metro', 'OMR corridor'] },
  { slug: 'pune', name: 'Pune', stateCode: 'MH', displayOrder: 4, queryTerms: ['Pune real estate', 'PMRDA', 'Pune ring road', 'Hinjewadi'] },
  { slug: 'mumbai', name: 'Mumbai', stateCode: 'MH', displayOrder: 5, queryTerms: ['Mumbai real estate', 'MMRDA', 'Navi Mumbai airport', 'coastal road'] },
  { slug: 'delhi-ncr', name: 'Delhi NCR', stateCode: 'DL', displayOrder: 6, queryTerms: ['Delhi NCR real estate', 'DDA', 'Noida', 'Gurugram', 'Dwarka expressway'] },
  { slug: 'vijayawada-amaravati', name: 'Vijayawada–Amaravati', stateCode: 'AP', displayOrder: 7, queryTerms: ['Amaravati', 'CRDA', 'Vijayawada real estate', 'Andhra Pradesh capital'] },
  { slug: 'visakhapatnam', name: 'Visakhapatnam', stateCode: 'AP', displayOrder: 8, queryTerms: ['Visakhapatnam real estate', 'VMRDA', 'Vizag port', 'Andhra Pradesh land'] },
];

export async function seedCities(): Promise<number> {
  for (const c of SEED_CITIES) {
    await prisma.newsCity.upsert({
      where: { slug: c.slug },
      update: { name: c.name, stateCode: c.stateCode ?? null, displayOrder: c.displayOrder, queryTerms: c.queryTerms, excludeTerms: EXCLUDE, geoLat: c.geoLat ?? null, geoLng: c.geoLng ?? null, isActive: true },
      create: { slug: c.slug, name: c.name, stateCode: c.stateCode ?? null, displayOrder: c.displayOrder, queryTerms: c.queryTerms, excludeTerms: EXCLUDE, geoLat: c.geoLat ?? null, geoLng: c.geoLng ?? null, isActive: true },
    });
  }
  return prisma.newsCity.count();
}
