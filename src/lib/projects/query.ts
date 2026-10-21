/**
 * The public project feed's filters as a Prisma where-clause. Shared by
 * GET /api/projects and the saved-search alerts, so an alert matches exactly
 * what the buyer saw on /projects.
 */
import type { Prisma } from "@prisma/client";

// The type chips speak in buyer terms; older rows stored "Residential" for flats.
const TYPE_ALIASES: Record<string, string[]> = {
  Apartment: ["Apartment", "Residential"],
  Residential: ["Apartment", "Residential"],
};

/** Filters as the /projects page sends them (all optional). */
export interface ProjectFilters {
  corridor?: string | null;
  locality?: string | null;
  type?: string | null;
  risk?: string | null;
  city?: string | null;
  q?: string | null;
  minBudget?: number | null;
  maxBudget?: number | null;
  status?: string | null;
}

export function filtersFromParams(sp: URLSearchParams): ProjectFilters {
  const num = (k: string) => (sp.get(k) ? parseFloat(sp.get(k)!) : null);
  return {
    corridor: sp.get("corridor"),
    locality: sp.get("locality")?.trim() || null,
    type: sp.get("type"),
    risk: sp.get("risk"),
    city: sp.get("city"),
    q: sp.get("q")?.trim() || null,
    minBudget: num("minBudget"),
    maxBudget: num("maxBudget"),
    status: sp.get("status"),
  };
}

export function projectWhere(f: ProjectFilters): Prisma.ProjectWhereInput {
  const where: Prisma.ProjectWhereInput = {};
  const and: Prisma.ProjectWhereInput[] = [];
  const status = f.status || "ACTIVE";
  if (status !== "ALL") where.status = status as Prisma.EnumProjectStatusFilter["equals"];
  if (f.corridor) where.corridor = f.corridor;
  if (f.city) where.city = f.city;
  if (f.risk) where.riskLevel = f.risk as Prisma.EnumRiskLevelFilter["equals"];
  if (f.type) where.propertyType = { in: TYPE_ALIASES[f.type] ?? [f.type] };
  if (f.q) {
    and.push({
      OR: [
        { name: { contains: f.q, mode: "insensitive" } },
        { developer: { contains: f.q, mode: "insensitive" } },
        { corridor: { contains: f.q, mode: "insensitive" } },
        { addressLine: { contains: f.q, mode: "insensitive" } },
        // A locality picked from the search suggestions (stored exactly as listed).
        { specifications: { path: ["locality"], equals: f.q } },
        { specifications: { path: ["subLocality"], equals: f.q } },
      ],
    });
  }
  if (f.locality) and.push({ specifications: { path: ["locality"], equals: f.locality } });
  // Budget: the project's price range overlaps the requested one.
  if (f.minBudget != null || f.maxBudget != null) {
    and.push({ minBudgetLakhs: { lte: f.maxBudget ?? 999999 } }, { maxBudgetLakhs: { gte: f.minBudget ?? 0 } });
  }
  if (and.length) where.AND = and;
  // Seller Mode: never surface low-quality seller listings in the default feed.
  where.NOT = { listingSource: "SELLER", listingScore: { lt: 40 } };
  return where;
}

/** A short human label for a saved search: "Plots · Kokapet · ₹30–60 L". */
export function describeFilters(f: ProjectFilters): string {
  const budget =
    f.minBudget != null && f.maxBudget != null ? `₹${f.minBudget}–${f.maxBudget} L` : f.maxBudget != null ? `under ₹${f.maxBudget} L` : f.minBudget != null ? `over ₹${f.minBudget} L` : null;
  const parts = [f.type, f.locality, f.corridor, budget, f.risk ? `${f.risk.toLowerCase()} risk` : null, f.q ? `“${f.q}”` : null].filter(Boolean);
  return parts.length ? parts.join(" · ") : "All projects";
}
