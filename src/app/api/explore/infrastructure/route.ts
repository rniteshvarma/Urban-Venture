// GET /api/explore/infrastructure?ids=  — geometry for the map's layer panel.
//
// Constraint 6: confirmed and unconfirmed infrastructure must never look alike.
// "Pending" is derived from InfraProject.status, NOT from a hardcoded name —
// the seeded data has RRR *Northern* Arc in LAND_ACQUISITION and the Southern
// Arc merely APPROVED, so hardcoding "RRR South = pending" would mislabel it.
//
// Geometry today: InfraProject rows carry optional `latitude`/`longitude` and a
// `coordinates` JSON polyline ([[lat,lng], ...]). Rows without either are
// returned with `hasGeometry: false` so the UI can disable the toggle honestly
// instead of offering a layer that draws nothing.
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Statuses where the alignment/'footprint' is committed on the ground. */
const CONFIRMED = new Set(["COMPLETE", "PARTIALLY_COMPLETE", "UNDER_CONSTRUCTION"]);

/** [lat,lng][] (storage order) → [lng,lat][] (GeoJSON order). */
function toGeoJsonLine(raw: unknown): [number, number][] | null {
  if (!Array.isArray(raw)) return null;
  const out: [number, number][] = [];
  for (const pt of raw) {
    if (Array.isArray(pt) && pt.length >= 2) {
      const [lat, lng] = pt as [number, number];
      if (Number.isFinite(lat) && Number.isFinite(lng)) out.push([lng, lat]);
    }
  }
  return out.length >= 2 ? out : null;
}

export async function GET(req: Request) {
  try {
    const ids = (new URL(req.url).searchParams.get("ids") ?? "")
      .split(",").map((s) => s.trim()).filter(Boolean);

    const rows = await prisma.infraProject.findMany({
      where: {
        status: { not: "CANCELLED" },
        ...(ids.length > 0 ? { id: { in: ids } } : {}),
      },
      select: {
        id: true, name: true, shortName: true, category: true, status: true,
        latitude: true, longitude: true, coordinates: true, affectedCorridorSlugs: true,
      },
      orderBy: { category: "asc" },
    });

    const layers = rows.map((r) => {
      const line = toGeoJsonLine(r.coordinates);
      const hasPoint = r.latitude != null && r.longitude != null;
      const confirmed = CONFIRMED.has(r.status);
      return {
        id: r.id,
        name: r.name,
        shortName: r.shortName,
        category: r.category,
        status: r.status,
        confirmed,
        // Shown as a tooltip next to the toggle.
        statusNote: confirmed
          ? `${r.status.replace(/_/g, " ").toLowerCase()} — alignment committed`
          : r.status === "LAND_ACQUISITION"
            ? "Land acquisition incomplete — alignment may still change"
            : `${r.status.replace(/_/g, " ").toLowerCase()} — not yet committed on the ground`,
        hasGeometry: !!line || hasPoint,
        geometry: line
          ? { type: "LineString" as const, coordinates: line }
          : hasPoint
            ? { type: "Point" as const, coordinates: [r.longitude!, r.latitude!] as [number, number] }
            : null,
        corridors: r.affectedCorridorSlugs,
      };
    });

    return NextResponse.json({
      layers,
      // How many of these can actually be drawn right now.
      withGeometry: layers.filter((l) => l.hasGeometry).length,
      total: layers.length,
    });
  } catch (error) {
    console.error("GET /api/explore/infrastructure", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
