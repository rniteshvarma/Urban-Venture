// GET /api/explore/nearby?categories=hospital,transit — OpenStreetMap places
// for the Explore map's "Nearby" layers. Compact rows; the whole region is
// a few thousand points, so a category is sent in full and cached.
// Data © OpenStreetMap contributors (ODbL).
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { NEARBY_CATEGORIES, type OsmCategory } from "@/lib/osm/categories";

export async function GET(req: Request) {
  try {
    const asked = (new URL(req.url).searchParams.get("categories") ?? "").split(",").map((s) => s.trim());
    const categories = asked.filter((c): c is OsmCategory => (NEARBY_CATEGORIES as string[]).includes(c));
    if (!categories.length) return NextResponse.json({ features: [] });

    const rows = await prisma.osmFeature.findMany({
      where: { category: { in: categories } },
      select: { id: true, category: true, subcategory: true, name: true, lat: true, lng: true },
    });
    const features = rows.map((r) => ({ id: r.id, c: r.category, s: r.subcategory, n: r.name, lat: r.lat, lng: r.lng }));
    return NextResponse.json({ features }, { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } });
  } catch (error) {
    console.error("GET /api/explore/nearby", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
