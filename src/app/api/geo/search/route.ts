// GET /api/geo/search?q= — typeahead for the Explore Map search bar.
//
// Searches this project's OWN geography first: the localities and areas our
// listings sit in (framed by those listings' own pins), then corridors, then
// villages / mandals / districts from the geo layer. The village tables are
// empty until the LGD/boundary ETL is run, so those groups simply return
// nothing today rather than erroring.
//
// Each result carries the camera target the map should fly to. A corridor whose
// centroid has not been populated returns `flyTo: null` — the UI then filters
// by that corridor instead of recentring, rather than jumping somewhere wrong.
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { lookupPlace } from "@/lib/infra-intel/geo";

export const dynamic = "force-dynamic";

export interface GeoSearchResult {
  id: string;
  label: string;
  sublabel: string | null;
  group: "Localities" | "Areas" | "Corridors" | "Villages" | "Mandals" | "Districts";
  flyTo: { lat: number; lng: number; zoom: number } | null;
  /** [west, south, east, north] — frame the map on these when present. */
  bounds?: [number, number, number, number];
  /** For corridors: apply as a filter when we cannot fly. */
  corridorSlug?: string;
}

// ── Localities / areas from the listings themselves ──────────────────────
interface Place { name: string; area: string | null; count: number; flyTo: { lat: number; lng: number; zoom: number }; bounds: [number, number, number, number] }

const KM_PER_DEG = 111;
const median = (xs: number[]) => {
  const v = [...xs].sort((a, b) => a - b);
  return v[Math.floor(v.length / 2)];
};

/** Frame a set of pins, ignoring stray ones more than 15 km from the middle. */
function frame(points: { lat: number; lng: number }[]): Pick<Place, "flyTo" | "bounds"> {
  const mLat = median(points.map((p) => p.lat));
  const mLng = median(points.map((p) => p.lng));
  const near = points.filter((p) => Math.hypot((p.lat - mLat) * KM_PER_DEG, (p.lng - mLng) * KM_PER_DEG * Math.cos((mLat * Math.PI) / 180)) <= 15);
  const pts = near.length ? near : points;
  const lats = pts.map((p) => p.lat), lngs = pts.map((p) => p.lng);
  return {
    flyTo: { lat: mLat, lng: mLng, zoom: 13 },
    bounds: [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)],
  };
}

let placesCache: { at: number; places: Place[] } | null = null;

/** Every locality and area that has live, mapped listings (cached for 5 minutes). */
async function listingPlaces(): Promise<Place[]> {
  if (placesCache && Date.now() - placesCache.at < 5 * 60_000) return placesCache.places;
  const rows = await prisma.project.findMany({
    where: { status: "ACTIVE", latitude: { not: null }, longitude: { not: null }, NOT: { listingSource: "SELLER", listingScore: { lt: 40 } } },
    select: { corridor: true, latitude: true, longitude: true, specifications: true },
  });
  const groups = new Map<string, { area: string | null; pts: { lat: number; lng: number }[] }>();
  const add = (key: string, area: string | null, lat: number, lng: number) => {
    const g = groups.get(key) ?? { area, pts: [] };
    g.pts.push({ lat, lng });
    groups.set(key, g);
  };
  for (const r of rows) {
    const locality = (r.specifications as { locality?: unknown } | null)?.locality;
    if (typeof locality === "string" && locality.trim()) add(`L:${locality}`, r.corridor, r.latitude!, r.longitude!);
    if (r.corridor) add(`A:${r.corridor}`, null, r.latitude!, r.longitude!);
  }
  const places = [...groups].map(([key, g]) => ({ name: key.slice(2), area: g.area, count: g.pts.length, ...frame(g.pts) }));
  placesCache = { at: Date.now(), places };
  return places;
}

function matchPlaces(places: Place[], q: string, isArea: boolean, take: number): Place[] {
  const needle = q.toLowerCase();
  return places
    .filter((p) => (p.area === null) === isArea && p.name.toLowerCase().includes(needle))
    .sort((a, b) => Number(!b.name.toLowerCase().startsWith(needle)) - Number(!a.name.toLowerCase().startsWith(needle)) || b.count - a.count)
    .slice(0, take);
}

export async function GET(req: Request) {
  try {
    const q = (new URL(req.url).searchParams.get("q") ?? "").trim();
    if (q.length < 2) return NextResponse.json({ results: [] });

    const like = { contains: q, mode: "insensitive" as const };

    const [places, corridors, villages, mandals, districts] = await Promise.all([
      listingPlaces(),
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

    const homes = (n: number) => `${n} ${n === 1 ? "home" : "homes"}`;
    const results: GeoSearchResult[] = [
      ...matchPlaces(places, q, false, 6).map((p) => ({
        id: `locality:${p.name}`,
        label: p.name,
        sublabel: `${p.area ?? ""} · ${homes(p.count)}`,
        group: "Localities" as const,
        flyTo: p.flyTo,
        bounds: p.bounds,
      })),
      ...matchPlaces(places, q, true, 3).map((p) => ({
        id: `area:${p.name}`,
        label: p.name,
        sublabel: homes(p.count),
        group: "Areas" as const,
        flyTo: p.flyTo,
        bounds: p.bounds,
      })),
      ...corridors.map((c) => ({
        id: `corridor:${c.slug}`,
        label: c.shortName || c.name,
        sublabel: c.name,
        group: "Corridors" as const,
        // No stored centroid: fall back to the gazetteer location of its name,
        // as /api/market/corridors already does.
        flyTo: c.centroidLat != null && c.centroidLng != null
          ? { lat: c.centroidLat, lng: c.centroidLng, zoom: c.defaultZoom ?? 12 }
          : (() => {
              const place = lookupPlace(c.shortName || c.name);
              return place ? { lat: place.lat, lng: place.lng, zoom: c.defaultZoom ?? 12 } : null;
            })(),
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
