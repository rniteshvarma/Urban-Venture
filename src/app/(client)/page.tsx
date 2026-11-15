/**
 * Homepage. The server preloads the corridors, featured projects and city
 * figures (so the HTML holds them for search engines and a fast first paint),
 * and renders the lower sections — budget tiles, Tiger Score, localities, area
 * prices, services, builders, government projects, news and FAQ — straight
 * from the database.
 */
import { pageMeta } from "@/lib/site";
import { routeJson } from "@/lib/server/route-data";
import { GET as corridorsGET } from "@/app/api/market/corridors/route";
import { GET as projectsGET } from "@/app/api/projects/route";
import { GET as pulseGET } from "@/app/api/market/pulse/route";
import { GET as infraGET } from "@/app/api/market/infrastructure/route";
import HomeView, { type HomeInitial, type PulseFigures } from "./HomeView";
import { loadHomeSections } from "@/lib/home/sections";
import { BudgetTiles, MoreSections } from "@/components/home/HomeSections";
import type { CorridorCardData, ProjectCardData } from "@/components/ui";

// Rebuilt at most hourly from the database, so new listings, scores and figures appear without a redeploy.
export const revalidate = 3600;

export const metadata = pageMeta(
  "",
  "Property Tiger | Hyderabad property research",
  "Hyderabad property research: prices measured from real listings, developers' TG-RERA records and tracked government infrastructure, area by area.",
);

export default async function HomePage() {
  const [corridors, projects, pulse, infra, sections] = await Promise.all([
    routeJson<CorridorCardData[]>((r) => corridorsGET(r), "/api/market/corridors"),
    routeJson<ProjectCardData[]>((r) => projectsGET(r), "/api/projects?limit=8"),
    routeJson<{ figures?: PulseFigures }>(() => pulseGET(), "/api/market/pulse"),
    routeJson<unknown>((r) => infraGET(r), "/api/market/infrastructure"),
    loadHomeSections(),
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
  return (
    <HomeView
      initial={initial}
      slots={sections ? { budget: <BudgetTiles d={sections} />, more: <MoreSections d={sections} /> } : undefined}
    />
  );
}
