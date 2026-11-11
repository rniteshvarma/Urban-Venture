/**
 * Reading a re-fetched source page: is the listing still there, and (for
 * 1acre) what is its asking price now? Each source signals "gone" differently:
 *   1acre       → HTTP 410/404, or the listing's status is no longer "active"
 *   RoofandFloor→ HTTP 404
 *   Homes247    → HTTP 404
 *   Housiey     → HTTP 200 with a stub page titled "<slug> - Housiey"
 * Anything else (5xx, timeouts, blocks) is UNKNOWN: we never mark a listing
 * gone because a site was down. Pure: tested in freshness.test.ts.
 */
import { readOneAcre } from "./sources/oneacre";

export type PageVerdict =
  | { state: "LIVE"; priceLakh?: { min: number; max: number } | null }
  | { state: "GONE"; reason: string }
  | { state: "UNKNOWN"; reason: string };

/** Politeness per host, in ms between requests (1acre's robots.txt asks for 10 s). */
export const CRAWL_DELAY_MS: Record<string, number> = {
  "1acre.in": 10_000,
  "roofandfloor.com": 1_500,
  "homes247.in": 3_000,
  "housiey.com": 2_000,
};

export const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};

export function readSourcePage(url: string, status: number, html: string): PageVerdict {
  const host = hostOf(url);
  if (status === 404 || status === 410) return { state: "GONE", reason: `HTTP ${status}` };
  if (status !== 200) return { state: "UNKNOWN", reason: `HTTP ${status}` };

  if (host === "1acre.in") {
    const l = readOneAcre(html, url);
    if (!l) return { state: "UNKNOWN", reason: "listing data not found on the page" };
    if (l.status && l.status !== "active") return { state: "GONE", reason: `status ${l.status}` };
    const p = l.totalPriceLakh;
    return { state: "LIVE", priceLakh: p != null && p > 0 ? { min: p, max: p } : null };
  }
  if (host === "housiey.com") {
    const slug = url.split("/").filter(Boolean).pop() ?? "";
    const title = html.match(/<title>([^<]*)<\/title>/i)?.[1]?.trim() ?? "";
    if (slug && title.toLowerCase() === `${slug} - housiey`.toLowerCase()) return { state: "GONE", reason: "stub page" };
    return { state: "LIVE" };
  }
  return { state: "LIVE" };
}

/** Whether a new asking price is a real move worth recording (≥ 1% or ≥ ₹0.5 L). */
export function isPriceMove(from: { min: number; max: number }, to: { min: number; max: number }): boolean {
  const moved = (a: number, b: number) => Math.abs(a - b) >= Math.max(0.5, a * 0.01);
  return moved(from.min, to.min) || moved(from.max, to.max);
}
