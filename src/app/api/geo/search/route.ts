// GET /api/geo/search?q= — typeahead for the Explore Map search bar.
//
// Searches this project's OWN geography first: corridors (populated), then
// villages / mandals / districts from the geo layer. The village tables are
// empty until the LGD/boundary ETL is run, so those groups simply return
// nothing today rather than erroring.
//
// Each result carries the camera target the map should fly to. A corridor whose
// centroid has not been populated returns `flyTo: null` — the UI then filters
// by that corridor instead of recentring, rather than jumping somewhere wrong.
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export interface GeoSearchResult {
  id: string;
  label: string;
  sublabel: string | null;
  group: "Corridors" | "Villages" | "Mandals" | "Districts";
  flyTo: { lat: number; lng: number; zoom: number } | null;
  /** For corridors: apply as a filter when we cannot fly. */
  corridorSlug?: string;
}

export async function GET(req: Request) {
  try {
    const q = (new URL(req.url).searchParams.get("q") ?? "").trim();
    if (q.length < 2) return NextResponse.json({ results: [] });

    const like = { contains: q, mode: "insensitive" as const };

    const [corridors, villages, mandals, districts] = await Promise.all([
      prisma.corridorProfile.findMany({
        where: { isPublished: true, OR: [{ name: like }, { shortName: like }, { slug: like }] },
        select: { slug: true, name: true, shortName: true, centroidLat: true, centroidLng: true, defaultZoom: true },
        take: 6,
      }),
      prisma.revenueVillage.findMany({
        where: { name: like },
        select: {
          id: true, name: true, centroidLat: true, centroidLng: true,
          mandal: { select: { name: true, district: { select: { name: true } } } },
        },
        take: 6,
      }),
      prisma.mandal.findMany({
        where: { name: like },
        select: { id: true, name: true, district: { select: { name: true } } },
        take: 4,
      }),
      prisma.district.findMany({
        where: { name: like },
        select: { id: true, name: true, state: { select: { name: true } } },
        take: 4,
      }),
    ]);

    const results: GeoSearchResult[] = [
      ...corridors.map((c) => ({
        id: `corridor:${c.slug}`,
        label: c.shortName || c.name,
        sublabel: c.name,
        group: "Corridors" as const,
        flyTo: c.centroidLat != null && c.centroidLng != null
          ? { lat: c.centroidLat, lng: c.centroidLng, zoom: c.defaultZoom ?? 12 }
          : null,
        corridorSlug: c.slug,
      })),
      ...villages.map((v) => ({
        id: `village:${v.id}`,
        label: v.name,
        sublabel: [v.mandal?.name, v.mandal?.district?.name].filter(Boolean).join(", ") || null,
        group: "Villages" as const,
        flyTo: v.centroidLat != null && v.centroidLng != null
          ? { lat: v.centroidLat, lng: v.centroidLng, zoom: 13 }
          : null,
      })),
      // Mandals and districts have no stored centroid; they narrow the search
      // visually only once village geometry exists.
      ...mandals.map((m) => ({
        id: `mandal:${m.id}`,
        label: m.name,
        sublabel: m.district?.name ?? null,
        group: "Mandals" as const,
        flyTo: null,
      })),
      ...districts.map((d) => ({
        id: `district:${d.id}`,
        label: d.name,
        sublabel: d.state?.name ?? null,
        group: "Districts" as const,
        flyTo: null,
      })),
    ];

    return NextResponse.json({ results });
  } catch (error) {
    console.error("GET /api/geo/search", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
