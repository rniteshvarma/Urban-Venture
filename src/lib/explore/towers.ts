/**
 * Approximate 3D shapes for a listing that has no real building outlines on
 * the map (OpenStreetMap is thin outside Hyderabad's IT belt).
 *
 * Everything here is drawn from the listing's own facts — tower count, floors,
 * land area, units — and the page must label it as approximate. Nothing is
 * invented: with no tower count we draw no towers, only the site.
 */

export interface SiteFacts {
  lat: number;
  lng: number;
  /** Stored propertyType: "Apartment" | "Villa" | "Plots" | "Land" | … */
  propertyType: string;
  towerCount?: number | null;
  /** As listed: "Stilt + 21 Floors", "G+4P+14", "2B+G+14", "10 Floors", "5". */
  floorsPerTower?: string | number | null;
  totalLandAcres?: number | null;
  totalUnits?: number | null;
}

export interface DrawnBlock {
  /** Closed ring of [lng, lat]. */
  polygon: [number, number][];
  heightM: number;
}

export interface DrawnSite {
  kind: "towers" | "villas" | "site-only";
  blocks: DrawnBlock[];
  /** Radius of the site disc, metres. */
  siteRadiusM: number;
  /** Plain-English note on what the shape is drawn from. */
  note: string;
}

const M_PER_DEG_LAT = 111_320;
const FLOOR_M = 3.1;

/** Site radius from land area (a circle of that area), kept to a sane range. */
export function siteRadiusM(acres: number | null | undefined, fallback = 90): number {
  if (!acres || acres <= 0) return fallback;
  return Math.min(450, Math.max(35, Math.sqrt((acres * 4046.86) / Math.PI)));
}

/** A w×d rectangle centred at (dx, dy) metres from the site centre, rotated by `rot` radians. */
function rect(lat: number, lng: number, dx: number, dy: number, w: number, d: number, rot: number): [number, number][] {
  const mLng = M_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180);
  const corners: [number, number][] = [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2], [-w / 2, -d / 2]];
  return corners.map(([x, y]) => {
    const rx = x * Math.cos(rot) - y * Math.sin(rot) + dx;
    const ry = x * Math.sin(rot) + y * Math.cos(rot) + dy;
    return [lng + rx / mLng, lat + ry / M_PER_DEG_LAT];
  });
}

/** Positions of n items on a centred grid that fits inside radius r. */
function grid(n: number, r: number, minGap: number): [number, number][] {
  const cols = Math.ceil(Math.sqrt(n));
  const rows = Math.ceil(n / cols);
  const gap = Math.max(minGap, Math.min((2 * r) / (cols + 0.4), (2 * r) / (rows + 0.4)));
  const out: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const c = i % cols, row = Math.floor(i / cols);
    const inRow = row === rows - 1 ? n - row * cols : cols; // centre a short last row
    out.push([(c - (inRow - 1) / 2) * gap, ((rows - 1) / 2 - row) * gap]);
  }
  return out;
}

/**
 * Above-ground storeys from a listed floor description. Sums the "+" parts:
 * ground / stilt count as one, podium ("4P") levels count, basements ("2B",
 * "Basement") don't. Null when no number can be read.
 */
export function parseFloors(listed: string | number | null | undefined): number | null {
  if (typeof listed === "number") return listed > 0 ? Math.min(Math.round(listed), 80) : null;
  if (!listed) return null;
  let total = 0, sawNumber = false;
  for (const raw of listed.split("+")) {
    const part = raw.trim().toLowerCase();
    if (!part || /basement|\d+\s*b\b|^b$|cellar/.test(part)) continue;
    const n = part.match(/\d+/);
    if (n) { total += Number(n[0]); sawNumber = true; }
    else if (/^(g|ground|stilt|s|lower ground|lg)\b/.test(part)) total += 1;
  }
  return sawNumber && total > 0 ? Math.min(total, 80) : null;
}

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

export function drawSite(f: SiteFacts): DrawnSite {
  const type = (f.propertyType || "").toLowerCase();
  const r = siteRadiusM(f.totalLandAcres, type.includes("villa") ? 140 : 90);
  const rot = 0.35; // a fixed slant so drawn blocks don't read as a spreadsheet

  if (type.includes("apartment") && f.towerCount && f.towerCount > 0) {
    const n = Math.min(Math.round(f.towerCount), 24);
    const floors = parseFloors(f.floorsPerTower);
    const height = (floors ?? 12) * FLOOR_M + 4;
    const blocks = grid(n, r * 0.8, 46).map(([dx, dy]) => ({ polygon: rect(f.lat, f.lng, dx, dy, 32, 21, rot), heightM: height }));
    return {
      kind: "towers",
      blocks,
      siteRadiusM: r,
      note: floors
        ? `Approximate shape: ${plural(n, "tower")} × ${floors} floors${typeof f.floorsPerTower === "string" ? ` (listed as “${f.floorsPerTower.trim()}”)` : ""}, from the listing`
        : `Approximate shape: ${plural(n, "tower")} from the listing (floor count not listed — drawn at 12)`,
    };
  }

  if (type.includes("villa") && f.totalUnits && f.totalUnits > 0) {
    const n = Math.min(Math.round(f.totalUnits), 90);
    const blocks = grid(n, r * 0.85, 22).map(([dx, dy]) => ({ polygon: rect(f.lat, f.lng, dx, dy, 13, 11, rot), heightM: 9 }));
    return { kind: "villas", blocks, siteRadiusM: r, note: `Approximate shape: ${plural(n, "villa")} from the listing` };
  }

  const what = type.includes("plot") || type.includes("land") ? "Open land — the site is marked" : "No building data for this listing — the site is marked";
  return { kind: "site-only", blocks: [], siteRadiusM: r, note: f.totalLandAcres ? `${what} (${f.totalLandAcres} acres)` : what };
}
