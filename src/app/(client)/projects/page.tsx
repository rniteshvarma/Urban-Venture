/**
 * /projects. The server loads the first page of results for the filters in
 * the URL, so the HTML lists real projects with links — for search engines
 * and a fast first paint. Filter changes and infinite scroll stay in the browser.
 */
import { Suspense } from "react";
import { pageMeta } from "@/lib/site";
import { routeJson } from "@/lib/server/route-data";
import { apiQuery, readFilters, type Corridor, type Page } from "@/lib/projects/list-filters";
import { GET as projectsGET } from "@/app/api/projects/route";
import { GET as corridorsGET } from "@/app/api/projects/corridors/route";
import ProjectsBrowser from "./ProjectsBrowser";

export const metadata = pageMeta(
  "/projects",
  "Hyderabad projects, plots and land — with TG-RERA numbers | Property Tiger",
  "Apartments, villas, plotted layouts and land around Hyderabad, with TG-RERA numbers, unit-wise prices, builders' delivery records and the real cost of buying.",
);

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function ProjectsPage({ searchParams }: { searchParams: SP }) {
  const raw = await searchParams;
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(raw)) if (typeof v === "string") sp.set(k, v);
  const key = apiQuery(readFilters(sp), 1);
  const [page, corridors] = await Promise.all([
    routeJson<Page>((r) => projectsGET(r), `/api/projects?${key}`),
    routeJson<Corridor[]>(() => corridorsGET(), "/api/projects/corridors"),
  ]);
  const initial = page ? { key, page, corridors: Array.isArray(corridors) ? corridors : [] } : null;
  return (
    // useSearchParams (filters from the URL) needs a Suspense boundary.
    <Suspense fallback={null}>
      <ProjectsBrowser initial={initial} />
    </Suspense>
  );
}
