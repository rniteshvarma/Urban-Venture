/**
 * Market hub. The server loads the corridors (with their price records),
 * infrastructure, approvals and city figures the page used to fetch from the
 * browser, so the HTML holds the area list, scores and sources.
 */
import { pageMeta } from "@/lib/site";
import { routeJson } from "@/lib/server/route-data";
import { GET as corridorsGET } from "@/app/api/market/corridors/route";
import { GET as infraGET } from "@/app/api/market/infrastructure/route";
import { GET as approvalsGET } from "@/app/api/market/approvals/route";
import { GET as pulseGET } from "@/app/api/market/pulse/route";
import { GET as pricingGET } from "@/app/api/market/corridors/[slug]/appreciation/route";
import MarketHubView, { type MarketInitial } from "./MarketHubView";

// Rebuilt at most hourly from the database, so new listings, scores and figures appear without a redeploy.
export const revalidate = 3600;

export const metadata = pageMeta(
  "/market",
  "Hyderabad property market — area prices, infrastructure & scores | Property Tiger",
  "Hyderabad areas compared on prices measured from listings, rental yield, government guidance values and tracked infrastructure such as the RRR and Metro Phase II — each figure with its source.",
);

type Corridor = { corridor: string } & Record<string, unknown>;

export default async function MarketPage() {
  const [corridors, infra, approvals, pulse] = await Promise.all([
    routeJson<Corridor[]>((r) => corridorsGET(r), "/api/market/corridors"),
    routeJson<unknown[]>((r) => infraGET(r), "/api/market/infrastructure"),
    routeJson<unknown[]>((r) => approvalsGET(r), "/api/market/approvals"),
    routeJson<{ success?: boolean; figures?: unknown }>(() => pulseGET(), "/api/market/pulse"),
  ]);
  if (!corridors) return <MarketHubView initial={null} />;
  // Each corridor's recorded prices, for its sparkline.
  const withPrices = await Promise.all(
    corridors.map(async (c) => {
      const path = `/api/market/corridors/${encodeURIComponent(c.corridor)}/appreciation`;
      const hist = await routeJson<{ pricePoints?: unknown[] }, { slug: string }>(pricingGET, path, { slug: c.corridor });
      return { ...c, pricePoints: hist?.pricePoints ?? [] };
    }),
  );
  const initial: MarketInitial = {
    corridors: withPrices,
    infra: Array.isArray(infra) ? infra : [],
    // The hub shows the latest ten; the full list lives at /market/approvals.
    approvals: Array.isArray(approvals) ? approvals.slice(0, 10) : [],
    pulse: pulse?.success && pulse.figures ? pulse.figures : null,
  };
  return <MarketHubView initial={initial} />;
}
