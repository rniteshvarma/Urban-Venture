/**
 * Homepage. Unchanged on screen: the server only preloads the corridors,
 * featured projects and city figures the page used to fetch from the browser,
 * so the HTML holds them for search engines and a fast first paint.
 */
import { pageMeta } from "@/lib/site";
import { routeJson } from "@/lib/server/route-data";
import { GET as corridorsGET } from "@/app/api/market/corridors/route";
import { GET as projectsGET } from "@/app/api/projects/route";
import { GET as pulseGET } from "@/app/api/market/pulse/route";
import { GET as infraGET } from "@/app/api/market/infrastructure/route";
import HomeView, { type HomeInitial, type PulseFigures } from "./HomeView";
import type { CorridorCardData, ProjectCardData } from "@/components/ui";

export const metadata = pageMeta(
  "",
  "Property Tiger | Hyderabad property research",
  "Hyderabad property research: prices measured from real listings, developers' TG-RERA records and tracked government infrastructure, area by area.",
);

export default async function HomePage() {
  const [corridors, projects, pulse, infra] = await Promise.all([
    routeJson<CorridorCardData[]>((r) => corridorsGET(r), "/api/market/corridors"),
    routeJson<ProjectCardData[]>((r) => projectsGET(r), "/api/projects?limit=8"),
    routeJson<{ figures?: PulseFigures }>(() => pulseGET(), "/api/market/pulse"),
    routeJson<unknown>((r) => infraGET(r), "/api/market/infrastructure"),
  ]);
  const infraCount = Array.isArray(infra) ? infra.length : Array.isArray((infra as { projects?: unknown[] } | null)?.projects) ? (infra as { projects: unknown[] }).projects.length : null;
  const initial: HomeInitial | null =
    corridors && projects
      ? {
          // The homepage cards don't use each corridor's full market figures (~6 KB each) — leave them out of the page.
          corridors: corridors.map((c) => {
            const card: Record<string, unknown> = { ...c };
            delete card.market;
            delete card.adminNote;
            return card as unknown as CorridorCardData;
          }),
          projects,
          infraCount,
          city: pulse?.figures ?? null,
        }
      : null;
  return <HomeView initial={initial} />;
}
