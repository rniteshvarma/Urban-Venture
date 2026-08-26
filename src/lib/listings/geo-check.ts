// Dependency-free point-in-polygon for village boundary checks. PostGIS is not
// installed; RevenueVillage.boundaryGeoJSON holds a plain GeoJSON polygon, so we
// ray-cast in JS. Returns null when there is no boundary data — the check simply
// "did not run" and must never be reported as a pass or a fail.

type Ring = [number, number][]; // [lng, lat]

function pointInRing(lng: number, lat: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersect = yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/** A polygon = outer ring plus optional holes. Point must be in outer, not in a hole. */
function pointInPolygon(lng: number, lat: number, polygon: Ring[]): boolean {
  if (polygon.length === 0) return false;
  if (!pointInRing(lng, lat, polygon[0])) return false;
  for (let h = 1; h < polygon.length; h++) if (pointInRing(lng, lat, polygon[h])) return false;
  return true;
}

interface GeoJSONGeometry {
  type?: string;
  coordinates?: unknown;
}

/**
 * True/false if the boundary is usable, null if there is no usable geometry.
 * Accepts a GeoJSON Polygon or MultiPolygon (or a Feature wrapping one).
 */
export function pointInsideBoundary(lat: number, lng: number, geojson: unknown): boolean | null {
  if (!geojson || typeof geojson !== "object") return null;
  let geom = geojson as GeoJSONGeometry & { geometry?: GeoJSONGeometry };
  if (geom.type === "Feature" && geom.geometry) geom = geom.geometry as typeof geom;

  const coords = geom.coordinates;
  if (geom.type === "Polygon" && Array.isArray(coords)) {
    return pointInPolygon(lng, lat, coords as Ring[]);
  }
  if (geom.type === "MultiPolygon" && Array.isArray(coords)) {
    for (const poly of coords as Ring[][]) if (pointInPolygon(lng, lat, poly)) return true;
    return false;
  }
  return null;
}
