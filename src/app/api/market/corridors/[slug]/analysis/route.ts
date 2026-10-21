import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import type { CorridorMarketStats } from "@/lib/market/compute";
import { marketSummary } from "@/lib/corridor-intelligence";
import { coverageGaps, type Fact } from "@/lib/market/narrative";
import { SNAPSHOT_SOURCE } from "@/lib/market/compute";

/**
 * GET /api/market/corridors/[slug]/analysis — the corridor's analyst report,
 * assembled from measured data only: our listings' prices, the scenario
 * forecast, the infrastructure tracker, TG-RERA delivery records and rents.
 * Every driver and risk carries its source; what we can't measure yet is
 * listed under `gaps` instead of being filled in.
 *
 * This replaced a report written by a model (or, without an API key, by
 * hand-typed fallback text with unsourced claims) and cached in a file.
 */
function modelOutlook(m: CorridorMarketStats) {
  const f = m.forecast[m.primaryAsset].scenarios;
  const what = m.primaryAsset === "plot" ? "plot prices" : "apartment prices";
  const line = (s: keyof typeof f) => `about ${f[s].cagr5}% a year for ${what} over 5 years (+${f[s].index[5] - 100}%)`;
  return { conservative: line("conservative"), base: line("base"), optimistic: line("optimistic") };
}

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const decodedSlug = decodeURIComponent(slug);
    const profile = await prisma.corridorProfile.findFirst({
      where: {
        OR: [
          { slug: { equals: decodedSlug, mode: "insensitive" } },
          { name: { equals: decodedSlug, mode: "insensitive" } },
          { shortName: { equals: decodedSlug, mode: "insensitive" } },
        ],
      },
      select: { slug: true, name: true, shortName: true, marketStats: true, marketComputedAt: true },
    });
    if (!profile) return NextResponse.json({ error: "Corridor not found" }, { status: 404 });

    const m = profile.marketStats as unknown as CorridorMarketStats | null;
    const n = m?.narrative;
    if (!m || !n) {
      return NextResponse.json({ available: false, reason: "This corridor's figures haven't been computed yet." });
    }
    const label = profile.shortName || profile.name;
    const hasYearOnYear = (await prisma.appreciationHistory.count({ where: { corridor: profile.slug, source: SNAPSHOT_SOURCE, yoyChange: { not: null } } })) > 0;

    // Every source the report leans on, once each.
    const sources = new Map<string, string | null>();
    const addSource = (f: Fact) => { if (!sources.has(f.source) || (!sources.get(f.source) && f.url)) sources.set(f.source, f.url ?? null); };
    [...n.drivers, ...n.risks].forEach(addSource);
    addSource({ source: m.city.aptAvgSqFt.source, url: m.city.aptAvgSqFt.url, text: "" });
    addSource({ source: "Property Tiger forecast model (city price growth published by RBI, Knight Frank and ANAROCK, plus the corridor's infrastructure pipeline)", url: "/market/forecast", text: "" });

    return NextResponse.json({
      available: true,
      corridor: profile.slug,
      headline: `${label}: corridor score ${n.overallScore}/100`,
      summary: marketSummary(label, m),
      heat: { rating: n.heatRating, basis: n.basis.heat },
      cycle: { stage: n.investmentCycle, basis: n.basis.cycle },
      risk: { level: n.riskLevel, basis: n.basis.risk },
      drivers: n.drivers,
      risks: n.risks,
      bestFor: n.bestFor,
      priceOutlook: modelOutlook(m),
      gaps: coverageGaps(m, n.delivery, hasYearOnYear),
      sources: [...sources].map(([name, url]) => ({ name, url })),
      generatedAt: profile.marketComputedAt ?? m.computedAt,
    });
  } catch (error: unknown) {
    console.error("Error in GET /api/market/corridors/[slug]/analysis:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
