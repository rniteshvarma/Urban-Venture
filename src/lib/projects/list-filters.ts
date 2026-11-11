/**
 * The /projects filters: read from and written to the URL, and turned into the
 * /api/projects query. Shared by the server page (first page of results) and
 * the browser (filter changes, infinite scroll).
 */
import type { ProjectCardData } from "@/components/ui";

export type SortKey = "relevance" | "price_asc" | "price_desc" | "newest";
export type Corridor = { name: string; count: number };
export type Page = { items: ProjectCardData[]; total: number; hasMore: boolean };

export const PAGE = 24;

export const TYPES = ["Apartment", "Villa", "Plots", "Commercial", "Land"];
export const RISKS = ["ALL", "LOW", "MEDIUM", "HIGH"];
export const SORTS: SortKey[] = ["relevance", "price_asc", "price_desc", "newest"];
/** Budget chip → the lakh range the feed and saved searches filter on. */
export const BUDGET_RANGE: Record<string, { minBudget: number | null; maxBudget: number | null }> = {
  ALL: { minBudget: null, maxBudget: null },
  "<30L": { minBudget: null, maxBudget: 30 },
  "30-60L": { minBudget: 30, maxBudget: 60 },
  "60-120L": { minBudget: 60, maxBudget: 120 },
  ">120L": { minBudget: 120, maxBudget: null },
};

export interface Filters {
  corridor: string;
  locality: string;
  risk: string;
  type: string;
  budget: string;
  sort: SortKey;
  q: string;
}

/** Filters live in the URL, so a filtered list can be shared and survives a refresh. */
export function readFilters(p: URLSearchParams): Filters {
  const type = p.get("type");
  const sort = p.get("sort") as SortKey | null;
  const budget = p.get("budget");
  const risk = p.get("risk");
  return {
    corridor: p.get("corridor") || "ALL",
    locality: p.get("locality")?.trim() || "",
    risk: risk && RISKS.includes(risk) ? risk : "ALL",
    type: type && TYPES.includes(type) ? type : "ALL",
    budget: budget && budget in BUDGET_RANGE ? budget : "ALL",
    sort: sort && SORTS.includes(sort) ? sort : "relevance",
    q: p.get("q")?.trim() ?? "",
  };
}

export function toQuery(f: Filters): URLSearchParams {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (f.corridor !== "ALL") p.set("corridor", f.corridor);
  if (f.locality) p.set("locality", f.locality);
  if (f.type !== "ALL") p.set("type", f.type);
  if (f.budget !== "ALL") p.set("budget", f.budget);
  if (f.risk !== "ALL") p.set("risk", f.risk);
  if (f.sort !== "relevance") p.set("sort", f.sort);
  return p;
}

export function apiQuery(f: Filters, page: number): string {
  const p = new URLSearchParams({ page: String(page), pageSize: String(PAGE) });
  if (f.corridor !== "ALL") p.set("corridor", f.corridor);
  if (f.locality) p.set("locality", f.locality);
  if (f.risk !== "ALL") p.set("risk", f.risk);
  if (f.type !== "ALL") p.set("type", f.type);
  if (f.q) p.set("q", f.q);
  if (f.sort !== "relevance") p.set("sort", f.sort);
  const b = BUDGET_RANGE[f.budget];
  if (b.minBudget != null) p.set("minBudget", String(b.minBudget));
  if (b.maxBudget != null) p.set("maxBudget", String(b.maxBudget));
  return p.toString();
}

