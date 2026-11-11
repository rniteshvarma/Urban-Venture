/**
 * The "₹4 L lower" badge: the latest recorded move in a project's starting
 * price, shown for 60 days. Pure: tested in src/lib/inventory/freshness.test.ts.
 */
import { formatLakh } from "@/lib/format";

export const PRICE_BADGE_DAYS = 60;

export interface PriceChangeRow {
  fromMinLakh: number;
  toMinLakh: number;
  changedAt: Date | string;
}

export interface PriceBadge {
  direction: "down" | "up";
  /** "₹4 L lower since 3 Oct" */
  label: string;
  deltaLakh: number;
}

export function priceBadge(c: PriceChangeRow | null | undefined, now = new Date()): PriceBadge | null {
  if (!c) return null;
  const at = new Date(c.changedAt);
  if (now.getTime() - at.getTime() > PRICE_BADGE_DAYS * 86_400_000) return null;
  const delta = Math.round((c.toMinLakh - c.fromMinLakh) * 100) / 100;
  if (!delta) return null;
  const when = at.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
  const amount = formatLakh(Math.abs(delta)).replace(/ Lakh\b/, " L");
  return delta < 0
    ? { direction: "down", deltaLakh: delta, label: `${amount} lower since ${when}` }
    : { direction: "up", deltaLakh: delta, label: `${amount} higher since ${when}` };
}
