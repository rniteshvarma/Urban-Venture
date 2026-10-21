/**
 * Loads the corridors and builds the /research report (recommend.ts).
 * Only Hyderabad is covered; other cities get an empty report saying so.
 */
import prisma from "../prisma";
import type { CorridorMarketStats } from "../market/compute";
import { recommend, type ResearchReport } from "./recommend";

export async function buildResearchReport(budget: number, horizon: number, city: string): Promise<ResearchReport> {
  if (city.trim().toLowerCase() !== "hyderabad") {
    return {
      executiveSummary: `We only cover Hyderabad so far, so we can't research ${city} yet.`,
      corridors: [], overallRiskScore: 0, riskRationale: "", marketOutlook: "",
      disclaimer: "Not investment advice.", basis: "",
    };
  }
  const rows = await prisma.corridorProfile.findMany({
    where: { isPublished: true },
    select: { slug: true, name: true, shortName: true, zone: true, overallScore: true, marketStats: true },
  });
  const corridors = rows
    .filter((r) => (r.marketStats as unknown as CorridorMarketStats | null)?.forecast)
    .map((r) => ({ slug: r.slug, name: r.name, shortName: r.shortName, zone: r.zone, overallScore: r.overallScore ?? 0, market: r.marketStats as unknown as CorridorMarketStats }));
  return recommend(corridors, budget, horizon);
}
