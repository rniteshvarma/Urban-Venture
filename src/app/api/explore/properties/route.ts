// GET /api/explore/properties — viewport GeoJSON for the Explore Map.
//
// Returns ONLY what the map paints plus what the hover tooltip shows. Full
// detail is a separate fetch on click (/api/explore/properties/[id]).
// Never returns seller contact details or document URLs.
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { gradeFor } from "@/lib/listings/score";
import {
  MAX_FEATURES, parseBbox, parseFilters, buildWhere, quintileBreaks, bandFor,
  round5, displayArea, tokenForStoredType,
} from "@/lib/explore/query";

export const dynamic = "force-dynamic";

// ── 60s response cache, keyed by bbox tile + filter hash (spec §1.2) ──
const CACHE = new Map<string, { at: number; body: unknown }>();
const TTL_MS = 60_000;
const CACHE_MAX = 200;

function cacheGet(key: string) {
  const hit = CACHE.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > TTL_MS) { CACHE.delete(key); return null; }
  return hit.body;
}
function cacheSet(key: string, body: unknown) {
  if (CACHE.size >= CACHE_MAX) {
    // drop the oldest entry — insertion order is preserved by Map
    const oldest = CACHE.keys().next().value;
    if (oldest) CACHE.delete(oldest);
  }
  CACHE.set(key, { at: Date.now(), body });
}

export async function GET(req: Request) {
  try {
    const sp = new URL(req.url).searchParams;
    const bbox = parseBbox(sp.get("bbox"));
    const zoom = Number(sp.get("zoom") ?? 9);
    const filters = parseFilters(sp);

    // Quantise the bbox into the cache key so small pans reuse a response.
    const q = (n: number) => Math.round(n * 100) / 100;
    const tile = bbox ? [q(bbox.minLng), q(bbox.minLat), q(bbox.maxLng), q(bbox.maxLat)].join(",") : "world";
    const key = `${tile}|${Math.round(zoom)}|${sp.get("propertyType") ?? ""}|${filters.source}|${filters.minPriceLakh ?? ""}|${filters.maxPriceLakh ?? ""}|${filters.minAreaSqYd ?? ""}|${filters.maxAreaSqYd ?? ""}|${filters.approvals.join("+")}|${filters.minScore ?? ""}|${filters.postedWithinDays ?? ""}|${filters.verifiedOnly}`;

    const cached = cacheGet(key);
    if (cached) return NextResponse.json(cached);

    const where = buildWhere(bbox, filters);

    const [count, rows] = await Promise.all([
      prisma.project.count({ where }),
      prisma.project.findMany({
        where,
        // Verified inventory first, then best-scoring — so a truncated
        // viewport still shows the most useful pins.
        orderBy: [{ listingSource: "asc" }, { listingScore: "desc" }],
        take: MAX_FEATURES,
        select: {
          id: true, name: true, latitude: true, longitude: true,
          minBudgetLakhs: true, maxBudgetLakhs: true, totalAreaSqYd: true,
          propertyType: true, listingSource: true, listingScore: true,
          approvalStatus: true, approvalVerified: true, imageUrls: true,
        },
      }),
    ]);

    // Price bands are computed from THIS viewport's distribution.
    const prices = rows.map((r) => r.maxBudgetLakhs || r.minBudgetLakhs).filter((n) => n > 0);
    const breaks = quintileBreaks(prices);

    const features = rows
      .filter((r) => r.latitude != null && r.longitude != null)
      .map((r) => {
        const priceLakh = r.maxBudgetLakhs || r.minBudgetLakhs || 0;
        const area = displayArea(r.totalAreaSqYd);
        // Rate in the same unit the area is expressed in.
        const rateValue = area && area.value > 0 ? Math.round((priceLakh * 100000) / area.value) : null;
        const isAdmin = r.listingSource === "ADMIN";
        return {
          type: "Feature" as const,
          geometry: { type: "Point" as const, coordinates: [round5(r.longitude!), round5(r.latitude!)] },
          properties: {
            id: r.id,
            ref: r.id.slice(0, 12).toUpperCase(),
            name: r.name,
            priceLakh,
            rateValue,
            rateUnit: area?.unit ?? null,
            areaValue: area?.value ?? null,
            areaUnit: area?.unit ?? null,
            propertyType: tokenForStoredType(r.propertyType),
            source: r.listingSource,
            // Admin inventory is verified by definition; seller listings must
            // have had their approval verified by a reviewer.
            isVerified: isAdmin || r.approvalVerified,
            scoreGrade: isAdmin ? null : r.listingScore != null ? gradeFor(r.listingScore) : null,
            priceBand: bandFor(priceLakh, breaks),
            thumb: r.imageUrls?.[0] ?? null,
          },
        };
      });

    const body = {
      type: "FeatureCollection" as const,
      count,
      truncated: count > features.length,
      priceBreaks: breaks,
      features,
    };

    cacheSet(key, body);
    return NextResponse.json(body);
  } catch (error) {
    console.error("GET /api/explore/properties", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
