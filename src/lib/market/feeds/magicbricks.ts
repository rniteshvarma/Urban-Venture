/**
 * MagicBricks locality rates — INTERNAL CROSS-CHECK ONLY.
 *
 * The owner decided these are used to sanity-check and calibrate our own
 * measured prices and are never republished (MagicBricks' terms haven't been
 * reviewed). Observations from here are stored with visibility INTERNAL and
 * only the admin market page reads them.
 *
 * Each locality page embeds `window.__LOCALITY_DATA__`: five quarters of
 * average asking rates for the page's property type, plus the latest average
 * for every type. Refreshed quarterly, one request at a time.
 *
 * Pure parsing is unit-tested in feeds.test.ts against real responses.
 */

export const MAGICBRICKS_SOURCE_NAME = "MagicBricks locality rates (internal cross-check)";
export type PortalAsset = "apartment" | "plot";

const PAGE: Record<PortalAsset, string> = {
  apartment: "Multistorey-Apartment-rates",
  plot: "Residential-Plot-rates",
};
export const magicbricksUrl = (locality: string, asset: PortalAsset) =>
  `https://www.magicbricks.com/Property-Rates-Trends/${PAGE[asset]}-${locality}-in-Hyderabad`;

export interface PortalSeries {
  locality: string;
  asset: PortalAsset;
  unit: "₹/sq.ft" | "₹/sq.yd";
  /** e.g. "Q3 2026" */
  latestQuarter: string;
  latest: number;
  /** Oldest → newest, as published: [{ quarter: "Jul-Sep'25", value }] */
  history: { quarter: string; value: number }[];
  /** Change over the published history (≈ a year for five quarters) */
  yoyPct: number | null;
}

interface LocalityData {
  locName?: string;
  dispQtr?: string;
  activePropType?: string;
  graphData?: { quarterValues?: string[]; averageRangeValues?: number[] };
}

const TYPE_ID: Record<PortalAsset, string> = { apartment: "10002", plot: "10000" };

export function parseLocalityData(json: LocalityData, asset: PortalAsset, locality: string): PortalSeries | null {
  // The graph is for whichever property type the page opened on.
  if (json.activePropType && json.activePropType !== TYPE_ID[asset]) return null;
  const q = json.graphData?.quarterValues ?? [];
  const v = json.graphData?.averageRangeValues ?? [];
  const history = q.map((quarter, i) => ({ quarter, value: Number(v[i]) })).filter((h) => Number.isFinite(h.value) && h.value > 0);
  if (!history.length) return null;
  const first = history[0].value, last = history[history.length - 1].value;
  return {
    locality: json.locName ?? locality,
    asset,
    unit: asset === "plot" ? "₹/sq.yd" : "₹/sq.ft",
    latestQuarter: json.dispQtr ?? history[history.length - 1].quarter,
    latest: last,
    history,
    yoyPct: history.length >= 5 ? Math.round(((last - first) / first) * 1000) / 10 : null,
  };
}

/** Pulls the embedded JSON out of a locality page. */
export function extractLocalityData(html: string): LocalityData | null {
  const marker = "window.__LOCALITY_DATA__ =";
  const i = html.indexOf(marker);
  if (i < 0) return null;
  const rest = html.slice(i + marker.length).trimStart();
  // Walk the braces to find where the object ends (the script continues after it).
  let depth = 0, inStr = false, esc = false;
  for (let j = 0; j < rest.length; j++) {
    const ch = rest[j];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === "{") depth++;
    else if (ch === "}" && --depth === 0) {
      try {
        return JSON.parse(rest.slice(0, j + 1)) as LocalityData;
      } catch {
        return null;
      }
    }
  }
  return null;
}

export async function fetchLocality(locality: string, asset: PortalAsset, timeoutMs = 25_000): Promise<PortalSeries | null> {
  const res = await fetch(magicbricksUrl(locality, asset), {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; PropertyTigerResearch/1.0; quarterly cross-check)" },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`MagicBricks HTTP ${res.status}`);
  const data = extractLocalityData(await res.text());
  return data ? parseLocalityData(data, asset, locality) : null;
}
