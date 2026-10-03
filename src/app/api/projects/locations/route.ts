import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import type { LocationSuggestion } from "@/lib/projects/location-search";

// Locations that currently have live projects — localities (Kokapet, Tellapur…)
// with the wider area they sit in, plus the areas themselves — for the
// location suggestions on the homepage search. Same visibility rule as the
// Projects feed and /api/projects/corridors.
export async function GET() {
  try {
    const rows = await prisma.project.findMany({
      where: { status: "ACTIVE", NOT: { listingSource: "SELLER", listingScore: { lt: 40 } } },
      select: { corridor: true, specifications: true },
    });

    const localities = new Map<string, { area: string; count: number }>();
    const areas = new Map<string, number>();
    for (const r of rows) {
      if (r.corridor) areas.set(r.corridor, (areas.get(r.corridor) ?? 0) + 1);
      const locality = (r.specifications as { locality?: unknown } | null)?.locality;
      if (typeof locality !== "string" || !locality.trim()) continue;
      const e = localities.get(locality) ?? { area: r.corridor, count: 0 };
      e.count++;
      localities.set(locality, e);
    }

    const byCount = (a: LocationSuggestion, b: LocationSuggestion) => b.count - a.count || a.name.localeCompare(b.name);
    const body: LocationSuggestion[] = [
      ...[...localities].map(([name, e]) => ({ name, area: e.area, count: e.count })).sort(byCount),
      ...[...areas].map(([name, count]) => ({ name, area: null, count })).sort(byCount),
    ];
    return NextResponse.json(body, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } });
  } catch (error) {
    console.error("GET /api/projects/locations", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
