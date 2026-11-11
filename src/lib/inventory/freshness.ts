/**
 * How fresh a listing's data is, from the last time we read its source.
 *
 * Two dates feed it: the collection date on each source (specifications.sources
 * [].accessed) and the re-check date (Project.sourceCheckedAt). The later one
 * wins. Land listings go stale fast (they sell), RERA projects slowly.
 * Pure: tested in freshness.test.ts.
 */

export type FreshnessState = "fresh" | "aging" | "gone";

export interface FreshnessInput {
  listingKind?: string | null;
  sourceCheckedAt?: Date | string | null;
  sourceState?: "LIVE" | "GONE" | null;
  sourceGoneSince?: Date | string | null;
  /** specifications.sources */
  sources?: { name?: string; url?: string; accessed?: string }[] | null;
}

export interface Freshness {
  state: FreshnessState;
  /** ISO date (yyyy-mm-dd) of the last successful read, or null when unknown */
  checkedOn: string | null;
  /** host of the main source, e.g. "1acre.in" */
  sourceName: string | null;
  daysSinceCheck: number | null;
  /** short label for cards and headers */
  label: string;
}

/** Days after which data is shown as "not re-checked since …". */
export const STALE_AFTER_DAYS = { land: 30, project: 90 } as const;

const DAY = 86_400_000;
const iso = (d: Date) => d.toISOString().slice(0, 10);
const toDate = (v: Date | string | null | undefined) => {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** "22 Oct 2026" */
export function shortDate(isoDay: string): string {
  const d = new Date(`${isoDay}T00:00:00Z`);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

export function freshnessOf(p: FreshnessInput, now = new Date()): Freshness {
  const land = p.listingKind === "LAND_LISTING";
  const main = p.sources?.find((s) => s.url && !/rerait\.telangana/.test(s.url)) ?? p.sources?.[0];
  let sourceName: string | null = null;
  try {
    sourceName = main?.url ? new URL(main.url).hostname.replace(/^www\./, "") : main?.name ?? null;
  } catch {
    sourceName = main?.name ?? null;
  }
  const collected = (p.sources ?? []).map((s) => toDate(s.accessed)).filter((d): d is Date => !!d);
  const checked = toDate(p.sourceCheckedAt);
  const last = [...collected, ...(checked ? [checked] : [])].sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
  const days = last ? Math.max(0, Math.floor((now.getTime() - last.getTime()) / DAY)) : null;
  const checkedOn = last ? iso(last) : null;

  if (p.sourceState === "GONE") {
    const since = toDate(p.sourceGoneSince) ?? checked;
    const when = since ? ` on ${shortDate(iso(since))}` : "";
    return {
      state: "gone",
      checkedOn,
      sourceName,
      daysSinceCheck: days,
      label: land ? `May be sold — gone from ${sourceName ?? "its source"}${when}` : `Listing removed from ${sourceName ?? "its source"}${when}`,
    };
  }
  if (!checkedOn) return { state: "aging", checkedOn: null, sourceName, daysSinceCheck: null, label: "Check date unknown" };
  const limit = land ? STALE_AFTER_DAYS.land : STALE_AFTER_DAYS.project;
  const ago = days === 0 ? "today" : days === 1 ? "yesterday" : `${days} days ago`;
  if (days! > limit) return { state: "aging", checkedOn, sourceName, daysSinceCheck: days, label: `Not re-checked since ${shortDate(checkedOn)}` };
  return { state: "fresh", checkedOn, sourceName, daysSinceCheck: days, label: `Last checked ${ago}` };
}
