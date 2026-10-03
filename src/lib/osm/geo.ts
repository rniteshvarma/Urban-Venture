/**
 * Small, dependency-free geometry for OpenStreetMap features around one city.
 * Distances are straight-line ("as the crow flies"); over a few tens of km a
 * local flat projection is accurate to well under 1%.
 */

export type LngLat = [number, number];
export type Ring = LngLat[];

const KM_PER_DEG_LAT = 110.574;
const kmPerDegLng = (lat: number) => 111.32 * Math.cos((lat * Math.PI) / 180);

export function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Shortest distance from a point to a ring's (or line's) edges, in km. */
export function distanceToRingKm(ring: Ring, lat: number, lng: number): number {
  if (ring.length === 0) return Infinity;
  const kx = kmPerDegLng(lat);
  const ky = KM_PER_DEG_LAT;
  const px = lng * kx, py = lat * ky;
  if (ring.length === 1) return Math.hypot(ring[0][0] * kx - px, ring[0][1] * ky - py);
  let best = Infinity;
  for (let i = 1; i < ring.length; i++) {
    const ax = ring[i - 1][0] * kx, ay = ring[i - 1][1] * ky;
    const bx = ring[i][0] * kx, by = ring[i][1] * ky;
    const dx = bx - ax, dy = by - ay;
    const len2 = dx * dx + dy * dy;
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
    const d = Math.hypot(ax + t * dx - px, ay + t * dy - py);
    if (d < best) best = d;
  }
  return best;
}

export function distanceToRingsKm(rings: Ring[], lat: number, lng: number): number {
  let best = Infinity;
  for (const r of rings) best = Math.min(best, distanceToRingKm(r, lat, lng));
  return best;
}

/** Ray-casting point-in-polygon for a closed ring. */
export function insideRing(ring: Ring, lat: number, lng: number): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Area of a closed ring in hectares (shoelace on a local projection). */
export function ringAreaHa(ring: Ring): number {
  if (ring.length < 3) return 0;
  const lat0 = ring.reduce((s, p) => s + p[1], 0) / ring.length;
  const kx = kmPerDegLng(lat0), ky = KM_PER_DEG_LAT;
  let sum = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    sum += ring[j][0] * kx * (ring[i][1] * ky) - ring[i][0] * kx * (ring[j][1] * ky);
  }
  return (Math.abs(sum) / 2) * 100; // km² → ha
}

/** Mean of a ring's vertices — a stable centre for lines and compact areas. */
export function ringCentre(rings: Ring[]): { lat: number; lng: number } | null {
  let n = 0, lat = 0, lng = 0;
  for (const r of rings) for (const [x, y] of r) { lng += x; lat += y; n++; }
  return n ? { lat: lat / n, lng: lng / n } : null;
}

/** Drop vertices closer than `minKm` to the last one kept (keeps the ends). */
export function thinRing(ring: Ring, minKm = 0.025): Ring {
  if (ring.length <= 2) return ring;
  const out: Ring = [ring[0]];
  for (let i = 1; i < ring.length - 1; i++) {
    const [lx, ly] = out[out.length - 1];
    if (haversineKm(ly, lx, ring[i][1], ring[i][0]) >= minKm) out.push(ring[i]);
  }
  out.push(ring[ring.length - 1]);
  return out;
}

/** A closed circle of `km` radius around a point, as [lng, lat] — for map rings. */
export function circleRing(lat: number, lng: number, km: number, steps = 96): Ring {
  const out: Ring = [];
  const kx = kmPerDegLng(lat);
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * 2 * Math.PI;
    out.push([lng + (km * Math.cos(a)) / kx, lat + (km * Math.sin(a)) / KM_PER_DEG_LAT]);
  }
  return out;
}
