/**
 * Telangana Registration & Stamps Department — unit rates (the official
 * "market value" / guidance value used to compute stamp duty), per village.
 * Public lookup at registration.telangana.gov.in/UnitRateMV; no login or
 * captcha. Values revise roughly once a year, so each village is refreshed
 * monthly at most, one request at a time.
 *
 * Only the columns the site shows are read: the land search gives ₹/sq.yd,
 * the apartment search ₹/sq.ft (ground / first / other floors). The page
 * keeps the residential/commercial label in an HTML comment, so we don't use
 * it. Instead each village reports:
 *   general  the village-wide rate ("REST ALL" or the village's own row), or
 *            the lowest rate when there is no such row — the base rate for
 *            ordinary plots and flats
 *   max      the highest rate (main roads and commercial stretches)
 *
 * Pure parsing is unit-tested in feeds.test.ts against real responses.
 */

const BASE = "https://registration.telangana.gov.in";
export const REGISTRATION_SOURCE_NAME = "Telangana Registration & Stamps Department — unit rates";
export const REGISTRATION_SOURCE_URL = `${BASE}/UnitRateMV/getDistrictList.htm`;

export interface RegistrationVillage {
  district: string;
  districtName: string;
  mandal: string;
  mandalName: string;
  village: string;
  villageName: string;
}

export interface UnitRateRow {
  locality: string;
  value: number;
  /** ISO date the rate took effect */
  effective: string | null;
}

export interface VillageRates {
  land: { general: number; max: number; rows: number } | null;
  apartment: { general: number; max: number; rows: number } | null;
  effective: string | null;
}

const num = (s: string) => {
  const n = Number(s.replace(/[^\d.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
};
const isoDate = (s: string) => {
  const m = s.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
};
const cellText = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();

/** Rows of a unit-rate result page. HTML comments (hidden columns) are dropped first. */
export function parseUnitRateRows(html: string): UnitRateRow[] {
  const body = html.replace(/<!--[\s\S]*?-->/g, "");
  const tbody = body.match(/<tbody>([\s\S]*?)<\/tbody>/i)?.[1] ?? "";
  const rows: UnitRateRow[] = [];
  for (const tr of tbody.match(/<tr>[\s\S]*?<\/tr>/gi) ?? []) {
    const cells = [...tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => cellText(m[1]));
    // S.No · ward-block · locality · value(s) … · effective date · "Get"
    if (cells.length < 5 || !/^\d+\.?$/.test(cells[0])) continue;
    const dateIdx = cells.findIndex((c) => /\d{2}\/\d{2}\/\d{4}/.test(c));
    if (dateIdx < 4) continue;
    // The last value column before the date: land value, or the "other floors" apartment rate.
    const value = num(cells[dateIdx - 1]);
    if (value == null) continue;
    rows.push({ locality: cells[2], value, effective: isoDate(cells[dateIdx]) });
  }
  return rows;
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

function generalRate(rows: UnitRateRow[], villageName: string) {
  if (!rows.length) return null;
  const v = villageName.replace(/\s*\(.*?\)|\[.*?\]/g, "").trim().toUpperCase();
  const village = rows.filter((r) => /^REST ALL/i.test(r.locality) || r.locality.toUpperCase() === v);
  const values = rows.map((r) => r.value);
  return {
    general: village.length ? median(village.map((r) => r.value)) : Math.min(...values),
    max: Math.max(...values),
    rows: rows.length,
  };
}

export function summariseVillage(villageName: string, land: UnitRateRow[], apartment: UnitRateRow[]): VillageRates {
  const dates = [...land, ...apartment].map((r) => r.effective).filter((d): d is string => !!d).sort();
  return { land: generalRate(land, villageName), apartment: generalRate(apartment, villageName), effective: dates.at(-1) ?? null };
}

// ── Fetching ────────────────────────────────────────────────────────────────

const UA = "Mozilla/5.0 (compatible; PropertyTigerResearch/1.0; monthly unit-rate check)";

/** The lookup needs a server session (JSESSIONID) before it answers. */
async function openSession(timeoutMs: number): Promise<string> {
  const res = await fetch(REGISTRATION_SOURCE_URL, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(timeoutMs), redirect: "manual" });
  const cookies = (res.headers.getSetCookie?.() ?? [res.headers.get("set-cookie") ?? ""]).map((c) => c.split(";")[0]).filter(Boolean);
  await res.text().catch(() => "");
  if (!cookies.length) throw new Error("registration portal gave no session");
  return cookies.join("; ");
}

async function search(cookie: string, v: RegistrationVillage, searchBy: "L" | "A", timeoutMs: number): Promise<string> {
  const form: Record<string, string> = {
    encodestr: "", locName: "", rValue: "U", tFlag: "", mndlName: v.mandalName, vlgName: v.villageName,
    districtId: v.district, mandalCode: v.mandal, divCode: "", villageCode: v.village, locality: "", RateType: "U", search_by: searchBy,
  };
  // The page base64-encodes its own fields into `encodestr` before submitting.
  form.encodestr = Buffer.from(JSON.stringify({ ...form, encodestr: "" })).toString("base64");
  const res = await fetch(`${BASE}/UnitRateMV/unitRateMV`, {
    method: "POST",
    headers: { "User-Agent": UA, "Content-Type": "application/x-www-form-urlencoded", Cookie: cookie, Referer: REGISTRATION_SOURCE_URL },
    body: new URLSearchParams(form).toString(),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`unit-rate lookup HTTP ${res.status}`);
  return res.text();
}

export async function fetchVillageRates(v: RegistrationVillage, opts: { cookie?: string; timeoutMs?: number } = {}) {
  const timeoutMs = opts.timeoutMs ?? 30_000;
  const cookie = opts.cookie ?? (await openSession(timeoutMs));
  const land = parseUnitRateRows(await search(cookie, v, "L", timeoutMs));
  await new Promise((r) => setTimeout(r, 800));
  const apartment = parseUnitRateRows(await search(cookie, v, "A", timeoutMs));
  return { cookie, rates: summariseVillage(v.villageName, land, apartment) };
}

export { openSession as openRegistrationSession };
