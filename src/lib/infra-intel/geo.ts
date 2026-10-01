/**
 * Geography for infra intelligence: the Hyderabad focus zone and a small
 * place gazetteer so a headline like "Tukkuguda–Maheshwaram road widening"
 * can be placed on the map without PostGIS or the (not yet loaded) LGD data.
 *
 * Focus zones (user decision, 2026-09-22): all of Telangana is tracked, but
 * the priority region is everything inside the Regional Ring Road plus a
 * 20 km band outside it.
 *
 * The RRR polygon below is an APPROXIMATION traced through the towns the
 * notified alignment passes (north arc: Sangareddy–Narsapur–Toopran–Gajwel–
 * Bhongir–Choutuppal; south arc: Choutuppal–Amangal–Shadnagar–Chevella–
 * Sangareddy). Good to a few km — enough for zoning, not for parcel work.
 * Coordinates in the gazetteer are approximate town/locality centres.
 */

export type FocusZone = 'INSIDE_RRR' | 'RRR_BUFFER' | 'TELANGANA' | 'OUTSIDE';

export const RRR_BUFFER_KM = 20;
export const HYDERABAD_CENTRE = { lat: 17.385, lng: 78.4867 };

/** [lat, lng] ring, clockwise from Sangareddy. */
export const RRR_POLYGON: [number, number][] = [
  [17.6246, 78.087], // Sangareddy
  [17.7389, 78.2847], // Narsapur
  [17.844, 78.479], // Toopran
  [17.845, 78.682], // Gajwel
  [17.829, 78.762], // Jagdevpur
  [17.5116, 78.8889], // Bhongir
  [17.251, 78.898], // Choutuppal
  [17.05, 78.8], // Shivannaguda / Maal
  [16.849, 78.53], // Amangal
  [17.071, 78.205], // Shadnagar
  [17.311, 78.137], // Chevella
  [17.455, 78.13], // Shankarpally
];

/** Rough Telangana bounding box — used to drop out-of-state items. */
const TG_BBOX = { minLat: 15.8, maxLat: 19.95, minLng: 77.2, maxLng: 81.35 };

export function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

export function pointInPolygon(lat: number, lng: number, poly: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [yi, xi] = poly[i];
    const [yj, xj] = poly[j];
    const crosses = yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
}

/** Equirectangular projection around the point — fine at city scale. */
function toXY(lat: number, lng: number, refLat: number): [number, number] {
  const kx = 111.32 * Math.cos((refLat * Math.PI) / 180);
  return [lng * kx, lat * 110.574];
}

function pointSegmentKm(p: [number, number], a: [number, number], b: [number, number]): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2));
  const cx = a[0] + t * dx;
  const cy = a[1] + t * dy;
  return Math.hypot(p[0] - cx, p[1] - cy);
}

/** Shortest distance (km) from a point to a polyline of [lat, lng] vertices. */
export function distanceToPolylineKm(lat: number, lng: number, line: [number, number][], closed = false): number {
  if (line.length === 0) return Infinity;
  if (line.length === 1) return haversineKm(lat, lng, line[0][0], line[0][1]);
  const p = toXY(lat, lng, lat);
  let best = Infinity;
  const n = closed ? line.length : line.length - 1;
  for (let i = 0; i < n; i++) {
    const a = line[i];
    const b = line[(i + 1) % line.length];
    best = Math.min(best, pointSegmentKm(p, toXY(a[0], a[1], lat), toXY(b[0], b[1], lat)));
  }
  return best;
}

export function inTelangana(lat: number, lng: number): boolean {
  return lat >= TG_BBOX.minLat && lat <= TG_BBOX.maxLat && lng >= TG_BBOX.minLng && lng <= TG_BBOX.maxLng;
}

export function classifyZone(lat: number, lng: number): FocusZone {
  if (pointInPolygon(lat, lng, RRR_POLYGON)) return 'INSIDE_RRR';
  if (distanceToPolylineKm(lat, lng, RRR_POLYGON, true) <= RRR_BUFFER_KM) return 'RRR_BUFFER';
  if (inTelangana(lat, lng)) return 'TELANGANA';
  return 'OUTSIDE';
}

/** Priority rank — higher is more focused. */
export const ZONE_RANK: Record<FocusZone, number> = { INSIDE_RRR: 3, RRR_BUFFER: 2, TELANGANA: 1, OUTSIDE: 0 };

export function isFocusZone(zone: FocusZone | string | null | undefined): boolean {
  return zone === 'INSIDE_RRR' || zone === 'RRR_BUFFER';
}

// ── Gazetteer ────────────────────────────────────────────────────────────────

export interface Place {
  name: string;
  lat: number;
  lng: number;
  aliases?: string[];
  /** Generic city-level names — resolve only if nothing more specific matched. */
  generic?: boolean;
  /** Fixed zone (e.g. "Telangana" alone says nothing about Hyderabad). */
  zone?: FocusZone;
}

export const GAZETTEER: Place[] = [
  // City-level
  { name: 'Hyderabad', lat: 17.385, lng: 78.4867, aliases: ['Cyberabad', 'GHMC area'], generic: true },
  { name: 'Secunderabad', lat: 17.4399, lng: 78.4983 },
  { name: 'Telangana', lat: 17.385, lng: 78.4867, generic: true, zone: 'TELANGANA' },

  // West / IT belt
  { name: 'Gachibowli', lat: 17.4401, lng: 78.3489 },
  { name: 'HITEC City', lat: 17.4483, lng: 78.3915, aliases: ['Hitech City', 'Hitec City', 'Madhapur'] },
  { name: 'Kondapur', lat: 17.46, lng: 78.357 },
  { name: 'Kukatpally', lat: 17.4948, lng: 78.3996 },
  { name: 'Miyapur', lat: 17.4969, lng: 78.3548 },
  { name: 'Kokapet', lat: 17.392, lng: 78.335, aliases: ['Neopolis'] },
  { name: 'Narsingi', lat: 17.386, lng: 78.357 },
  { name: 'Financial District', lat: 17.415, lng: 78.34, aliases: ['Nanakramguda'] },
  { name: 'Tellapur', lat: 17.463, lng: 78.286 },
  { name: 'Kollur', lat: 17.47, lng: 78.265 },
  { name: 'Patancheru', lat: 17.533, lng: 78.264 },
  { name: 'Mokila', lat: 17.448, lng: 78.208 },
  { name: 'Shankarpally', lat: 17.455, lng: 78.13 },
  { name: 'Nizampet', lat: 17.518, lng: 78.384 },
  { name: 'Bachupally', lat: 17.544, lng: 78.362 },
  { name: 'Jubilee Hills', lat: 17.432, lng: 78.407 },
  { name: 'Banjara Hills', lat: 17.415, lng: 78.438 },
  { name: 'Mehdipatnam', lat: 17.396, lng: 78.439 },
  { name: 'Begumpet', lat: 17.444, lng: 78.466 },
  { name: 'Raidurg', lat: 17.428, lng: 78.382, aliases: ['Rayadurg', 'Raidurgam'] },
  { name: 'KBR Park', lat: 17.4235, lng: 78.4254 },
  { name: 'Nallagandla', lat: 17.471, lng: 78.31 },
  { name: 'Khajaguda', lat: 17.418, lng: 78.37 },
  { name: 'Shaikpet', lat: 17.4, lng: 78.4 },
  { name: 'Tolichowki', lat: 17.397, lng: 78.414 },
  { name: 'Lingampally', lat: 17.488, lng: 78.317 },
  { name: 'Chandanagar', lat: 17.494, lng: 78.329 },
  { name: 'Beeramguda', lat: 17.519, lng: 78.3 },
  { name: 'Ameenpur', lat: 17.523, lng: 78.329 },
  { name: 'Paradise', lat: 17.4435, lng: 78.487, aliases: ['Paradise Junction'] },

  // South / airport / Future City
  { name: 'Rajendranagar', lat: 17.32, lng: 78.4 },
  { name: 'Attapur', lat: 17.37, lng: 78.427 },
  { name: 'Kismatpur', lat: 17.35, lng: 78.39 },
  { name: 'Shamshabad', lat: 17.253, lng: 78.4 },
  { name: 'RGIA', lat: 17.2403, lng: 78.4294, aliases: ['Rajiv Gandhi International Airport', 'Hyderabad airport', 'Shamshabad airport'] },
  { name: 'Tukkuguda', lat: 17.2006, lng: 78.4847 },
  { name: 'Maheshwaram', lat: 17.133, lng: 78.437 },
  { name: 'Kandukur', lat: 17.13, lng: 78.565 },
  { name: 'Adibatla', lat: 17.231, lng: 78.553 },
  { name: 'Kongara Kalan', lat: 17.2, lng: 78.59 },
  { name: 'Ibrahimpatnam', lat: 17.192, lng: 78.648 },
  { name: 'Mucherla', lat: 17.013, lng: 78.619, aliases: ['Future City', 'Fourth City', 'Pharma City', 'Bharat Future City'] },
  { name: 'Yacharam', lat: 17.05, lng: 78.66 },
  { name: 'Kadthal', lat: 16.986, lng: 78.493 },
  { name: 'Amangal', lat: 16.849, lng: 78.53 },
  { name: 'Shadnagar', lat: 17.071, lng: 78.205 },
  { name: 'Kothur', lat: 17.158, lng: 78.291 },
  { name: 'Chevella', lat: 17.311, lng: 78.137 },
  { name: 'Moinabad', lat: 17.33, lng: 78.27 },
  { name: 'Falaknuma', lat: 17.331, lng: 78.473 },
  { name: 'Chandrayangutta', lat: 17.316, lng: 78.488 },
  { name: 'Charminar', lat: 17.3616, lng: 78.4747, aliases: ['Old City'] },
  { name: 'Budvel', lat: 17.338, lng: 78.395 },
  { name: 'Aramghar', lat: 17.33, lng: 78.428 },
  { name: 'Bahadurpura', lat: 17.356, lng: 78.455 },
  { name: 'Saidabad', lat: 17.356, lng: 78.512 },
  { name: 'Malakpet', lat: 17.373, lng: 78.5, aliases: ['Nalgonda X Roads', 'Nalgonda Cross Roads'] },
  { name: 'Amberpet', lat: 17.39, lng: 78.517 },

  // East
  { name: 'Uppal', lat: 17.405, lng: 78.559 },
  { name: 'LB Nagar', lat: 17.347, lng: 78.552, aliases: ['L.B. Nagar', 'L B Nagar'] },
  { name: 'Dilsukhnagar', lat: 17.369, lng: 78.526 },
  { name: 'Nagole', lat: 17.374, lng: 78.562 },
  { name: 'Hayathnagar', lat: 17.327, lng: 78.604 },
  { name: 'Abdullapurmet', lat: 17.318, lng: 78.662 },
  { name: 'Peerzadiguda', lat: 17.4, lng: 78.601 },
  { name: 'Boduppal', lat: 17.413, lng: 78.579 },
  { name: 'Pocharam', lat: 17.43, lng: 78.64 },
  { name: 'Ghatkesar', lat: 17.45, lng: 78.685 },
  { name: 'Narapally', lat: 17.43, lng: 78.62 },
  { name: 'Nacharam', lat: 17.428, lng: 78.558 },
  { name: 'Cherlapally', lat: 17.462, lng: 78.59, aliases: ['Charlapalli', 'Cherlapalli'] },
  { name: 'ECIL', lat: 17.47, lng: 78.57, aliases: ['Kapra'] },
  { name: 'Malkajgiri', lat: 17.453, lng: 78.527 },
  { name: 'Keesara', lat: 17.52, lng: 78.66 },
  { name: 'Bibinagar', lat: 17.468, lng: 78.795 },
  { name: 'Bhongir', lat: 17.5116, lng: 78.8889, aliases: ['Bhuvanagiri', 'Yadadri Bhuvanagiri'] },
  { name: 'Yadagirigutta', lat: 17.587, lng: 78.943, aliases: ['Yadadri'] },
  { name: 'Choutuppal', lat: 17.251, lng: 78.898 },

  // North
  { name: 'Alwal', lat: 17.502, lng: 78.509 },
  { name: 'Bowenpally', lat: 17.47, lng: 78.48 },
  { name: 'Kompally', lat: 17.536, lng: 78.487 },
  { name: 'Jeedimetla', lat: 17.51, lng: 78.45 },
  { name: 'Dundigal', lat: 17.6, lng: 78.405 },
  { name: 'Gandimaisamma', lat: 17.576, lng: 78.425 },
  { name: 'Kandlakoya', lat: 17.582, lng: 78.492 },
  { name: 'Medchal', lat: 17.629, lng: 78.481 },
  { name: 'Shamirpet', lat: 17.593, lng: 78.563 },
  { name: 'Genome Valley', lat: 17.55, lng: 78.595, aliases: ['Turkapally'] },
  { name: 'Toopran', lat: 17.844, lng: 78.479 },
  { name: 'Gajwel', lat: 17.845, lng: 78.682 },
  { name: 'Narsapur', lat: 17.7389, lng: 78.2847 },
  { name: 'Sangareddy', lat: 17.6246, lng: 78.087 },
  { name: 'Sadashivpet', lat: 17.62, lng: 77.95 },
  { name: 'Zaheerabad', lat: 17.68, lng: 77.607 },
  { name: 'Vikarabad', lat: 17.338, lng: 77.904 },

  // District HQs / rest of Telangana
  { name: 'Siddipet', lat: 18.102, lng: 78.852 },
  { name: 'Medak', lat: 18.045, lng: 78.26 },
  { name: 'Kamareddy', lat: 18.32, lng: 78.34 },
  { name: 'Nizamabad', lat: 18.6725, lng: 78.0941 },
  { name: 'Adilabad', lat: 19.6641, lng: 78.532 },
  { name: 'Nirmal', lat: 19.096, lng: 78.344 },
  { name: 'Mancherial', lat: 18.871, lng: 79.46 },
  { name: 'Ramagundam', lat: 18.755, lng: 79.474 },
  { name: 'Peddapalli', lat: 18.613, lng: 79.374 },
  { name: 'Karimnagar', lat: 18.4386, lng: 79.1288 },
  { name: 'Jagtial', lat: 18.795, lng: 78.917 },
  { name: 'Sircilla', lat: 18.387, lng: 78.81 },
  { name: 'Warangal', lat: 17.9689, lng: 79.5941 },
  { name: 'Hanamkonda', lat: 18.007, lng: 79.558 },
  { name: 'Jangaon', lat: 17.724, lng: 79.152 },
  { name: 'Mulugu', lat: 18.191, lng: 79.943 },
  { name: 'Bhupalpally', lat: 18.43, lng: 79.86 },
  { name: 'Mahabubabad', lat: 17.6, lng: 80.0 },
  { name: 'Khammam', lat: 17.2473, lng: 80.1514 },
  { name: 'Kothagudem', lat: 17.55, lng: 80.619 },
  { name: 'Bhadrachalam', lat: 17.668, lng: 80.893 },
  { name: 'Nalgonda', lat: 17.0575, lng: 79.2684 },
  { name: 'Miryalaguda', lat: 16.872, lng: 79.562 },
  { name: 'Suryapet', lat: 17.14, lng: 79.62 },
  { name: 'Mahabubnagar', lat: 16.737, lng: 78.0, aliases: ['Mahbubnagar'] },
  { name: 'Jadcherla', lat: 16.763, lng: 78.143 },
  { name: 'Nagarkurnool', lat: 16.483, lng: 78.313 },
  { name: 'Wanaparthy', lat: 16.362, lng: 78.062 },
  { name: 'Gadwal', lat: 16.235, lng: 77.8 },
  { name: 'Narayanpet', lat: 16.745, lng: 77.496 },
  { name: 'Tandur', lat: 17.248, lng: 77.587 },
  { name: 'Kodangal', lat: 17.11, lng: 77.63 },
  { name: 'Mamnoor', lat: 17.912, lng: 79.6 },
];

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const MATCHERS: { place: Place; re: RegExp }[] = GAZETTEER.flatMap((place) =>
  [place.name, ...(place.aliases ?? [])].map((label) => ({
    place,
    re: new RegExp(`(^|[^A-Za-z])(${escapeRe(label)})(?![A-Za-z])`, 'gi'),
  })),
);

/**
 * Places mentioned in free text, specific ones first, deduped. A match that
 * sits inside a longer match is dropped — "Nalgonda X Roads" (Malakpet, inside
 * Hyderabad) must not also resolve to Nalgonda town 100 km away.
 */
export function findPlaces(text: string): Place[] {
  const spans: { place: Place; start: number; end: number }[] = [];
  for (const m of MATCHERS) {
    for (const hit of text.matchAll(m.re)) {
      const start = (hit.index ?? 0) + hit[1].length;
      spans.push({ place: m.place, start, end: start + hit[2].length });
    }
  }
  const kept = spans.filter(
    (a) => !spans.some((b) => b !== a && b.start <= a.start && b.end >= a.end && b.end - b.start > a.end - a.start),
  );
  const seen = new Set<string>();
  const all: Place[] = [];
  for (const s of kept.sort((a, b) => a.start - b.start)) {
    if (!seen.has(s.place.name)) {
      seen.add(s.place.name);
      all.push(s.place);
    }
  }
  const specific = all.filter((p) => !p.generic);
  return specific.length > 0 ? specific : all;
}

export function lookupPlace(name: string): Place | null {
  const found = findPlaces(name);
  return found[0] ?? null;
}

export interface PlaceResolution {
  places: string[];
  lat: number | null;
  lng: number | null;
  zone: FocusZone | null;
}

/**
 * Resolve a set of place names (or free text) to a representative point and
 * the MOST focused zone any of them falls in — a road from Shadnagar to
 * Mahabubnagar still matters to the Hyderabad focus region.
 */
export function resolvePlaces(textOrNames: string | string[]): PlaceResolution {
  const places = Array.isArray(textOrNames)
    ? textOrNames.map((n) => lookupPlace(n)).filter((p): p is Place => !!p)
    : findPlaces(textOrNames);
  if (places.length === 0) return { places: [], lat: null, lng: null, zone: null };
  const lat = places.reduce((s, p) => s + p.lat, 0) / places.length;
  const lng = places.reduce((s, p) => s + p.lng, 0) / places.length;
  let zone: FocusZone = 'OUTSIDE';
  for (const p of places) {
    const z = p.zone ?? classifyZone(p.lat, p.lng);
    if (ZONE_RANK[z] > ZONE_RANK[zone]) zone = z;
  }
  return { places: [...new Set(places.map((p) => p.name))], lat, lng, zone };
}

/** Places that clearly put an item outside Telangana (queries are TG-scoped, but search results leak). */
const OUT_OF_STATE = [
  'Mumbai', 'Navi Mumbai', 'Pune', 'Nagpur', 'Maharashtra', 'Delhi', 'Gurugram', 'Gurgaon', 'Noida', 'Haryana', 'Bengaluru',
  'Bangalore', 'Karnataka', 'Chennai', 'Tamil Nadu', 'Kerala', 'Kochi', 'Gujarat', 'Ahmedabad', 'Kolkata', 'West Bengal',
  'Andhra Pradesh', 'Amaravati', 'Visakhapatnam', 'Vizag', 'Tirupati', 'coastal region', 'Odisha', 'Bhubaneswar',
  'Uttar Pradesh', 'Lucknow', 'Rajasthan', 'Jaipur', 'Madhya Pradesh', 'Bihar', 'Punjab', 'Goa', 'Chhattisgarh',
];
const OUT_RE = new RegExp(`(^|[^A-Za-z])(${OUT_OF_STATE.map(escapeRe).join('|')})(?![A-Za-z])`, 'i');

export function mentionsOutOfState(text: string): boolean {
  return OUT_RE.test(text);
}
