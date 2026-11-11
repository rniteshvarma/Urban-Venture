/**
 * Area (corridor) page. The server runs the same seven data loads the page
 * used to make from the browser and renders with them, so the HTML holds the
 * prices, rental yield, guidance values, infrastructure and checks.
 */
import { notFound } from "next/navigation";
import { routeJson } from "@/lib/server/route-data";
import { GET as profileGET } from "@/app/api/market/corridors/[slug]/route";
import { GET as pricingGET } from "@/app/api/market/corridors/[slug]/appreciation/route";
import { GET as demandGET } from "@/app/api/market/corridors/[slug]/demand/route";
import { GET as infraGET } from "@/app/api/market/corridors/[slug]/infra/route";
import { GET as approvalsGET } from "@/app/api/market/corridors/[slug]/approvals/route";
import { GET as analysisGET } from "@/app/api/market/corridors/[slug]/analysis/route";
import { GET as legalGET } from "@/app/api/market/legal/route";
import CorridorDetailView, { type CorridorInitial } from "./CorridorDetailView";

export default async function CorridorPage({ params }: { params: Promise<{ corridor: string }> }) {
  const { corridor } = await params;
  const slug = decodeURIComponent(corridor);
  const p = { slug };
  const base = `/api/market/corridors/${encodeURIComponent(slug)}`;
  const profile = await routeJson(profileGET, base, p);
  if (!profile) notFound();
  const [pricing, demand, infra, approvals, analysis, legal] = await Promise.all([
    routeJson(pricingGET, `${base}/appreciation`, p),
    routeJson(demandGET, `${base}/demand`, p),
    routeJson(infraGET, `${base}/infra`, p),
    routeJson(approvalsGET, `${base}/approvals`, p),
    routeJson(analysisGET, `${base}/analysis`, p),
    routeJson<{ success?: boolean; risks?: unknown[] }>(() => legalGET(), "/api/market/legal"),
  ]);
  const initial: CorridorInitial = {
    profile,
    pricing,
    demand,
    infra,
    approvals,
    analysis,
    legalRisks: legal?.success && Array.isArray(legal.risks) ? legal.risks : [],
  };
  return <CorridorDetailView slug={slug} initial={initial} />;
}
