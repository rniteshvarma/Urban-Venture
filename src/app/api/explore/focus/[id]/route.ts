// GET /api/explore/focus/[id] — what the 3D focus view needs for one listing:
// its building facts (towers, floors, land, units) for the approximate shape,
// the nearest place of each kind WITH its map position (the stored
// accessibility record keeps only name + distance), and the places within
// 5 km for the 3D pins. Places are OpenStreetMap data (© OpenStreetMap
// contributors). Same visibility rule as the map's detail card; no seller
// contact details.
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { haversineKm } from "@/lib/osm/geo";
import { headlinePrice } from "@/lib/explore/query";

export const dynamic = "force-dynamic";

// Kinds drawn as points (lakes and power lines are shapes, not pins).
const POINT_KINDS = ["hospital", "transit", "orr_exit", "bus_station", "airport", "school", "college", "mall", "job_hub", "park"] as const;
const WITHIN_KM = 5;
const MAX_PLACES = 400;

type Nearest = { name: string | null; km: number; sub?: string | null };

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const p = await prisma.project.findFirst({
      where: { id, listingStatus: "APPROVED" },
      select: {
        id: true, name: true, developer: true, corridor: true, latitude: true, longitude: true, propertyType: true,
        towerCount: true, floorsPerTower: true, totalLandAcres: true, totalUnits: true,
        minBudgetLakhs: true, maxBudgetLakhs: true, totalAreaSqYd: true, totalAreaSqFt: true, possessionText: true, reraNumber: true,
        imageUrls: true, tigerScore: true,
        accessibility: { select: { score: true, confidence: true, components: true, nearest: true, within: true, watchOuts: true } },
      },
    });
    if (!p) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (p.latitude == null || p.longitude == null) return NextResponse.json({ error: "This listing has no map pin" }, { status: 422 });
    const lat = p.latitude, lng = p.longitude;

    const stored = (p.accessibility?.nearest ?? {}) as Record<string, Nearest | undefined>;
    const reach = Math.max(WITHIN_KM, ...POINT_KINDS.map((k) => stored[k]?.km ?? 0)) + 1;
    const dLat = reach / 111.32, dLng = reach / (111.32 * Math.cos((lat * Math.PI) / 180));
    const rows = await prisma.osmFeature.findMany({
      where: { category: { in: [...POINT_KINDS] }, lat: { gte: lat - dLat, lte: lat + dLat }, lng: { gte: lng - dLng, lte: lng + dLng } },
      select: { id: true, category: true, subcategory: true, name: true, lat: true, lng: true },
    });
    const withKm = rows.map((r) => ({ ...r, km: haversineKm(lat, lng, r.lat, r.lng) }));

    // Locate the stored nearest place: same kind, same name, same distance.
    // (The score's own rules — e.g. airports = RGIA only, major job hubs — are
    // already baked into which place was stored, so we match it, not re-pick.)
    const nearest = POINT_KINDS.flatMap((kind) => {
      const s = stored[kind];
      if (!s) return [];
      const hit = withKm
        .filter((r) => r.category === kind && (s.name == null || r.name === s.name))
        .sort((a, b) => Math.abs(a.km - s.km) - Math.abs(b.km - s.km))[0];
      if (!hit || Math.abs(hit.km - s.km) > 0.15) return [];
      return [{ kind, name: s.name, sub: s.sub ?? null, km: s.km, lat: hit.lat, lng: hit.lng, id: hit.id }];
    });

    const places = withKm
      .filter((r) => r.km <= WITHIN_KM)
      .sort((a, b) => a.km - b.km)
      .slice(0, MAX_PLACES)
      .map((r) => ({ id: r.id, kind: r.category, name: r.name, lat: r.lat, lng: r.lng, km: Math.round(r.km * 100) / 100 }));

    const { priceLakh, priceFrom } = headlinePrice(p);
    return NextResponse.json({
      id: p.id,
      name: p.name,
      developer: p.developer || null,
      area: p.corridor,
      lat, lng,
      propertyType: p.propertyType,
      towerCount: p.towerCount, floorsPerTower: p.floorsPerTower, totalLandAcres: p.totalLandAcres, totalUnits: p.totalUnits,
      priceLakh, priceFrom, priceMaxLakh: p.maxBudgetLakhs || null,
      possession: p.possessionText ? p.possessionText.replace(/^(RERA|Target) possession/i, "Possession") : null,
      rera: !!p.reraNumber,
      tigerScore: p.tigerScore,
      image: p.imageUrls?.[0] ?? null,
      accessibility: p.accessibility ? { score: p.accessibility.score, confidence: p.accessibility.confidence, components: p.accessibility.components, within: p.accessibility.within, watchOuts: p.accessibility.watchOuts } : null,
      nearest,
      places,
      url: `/projects/${p.id}`,
    });
  } catch (error) {
    console.error("GET /api/explore/focus/[id]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
