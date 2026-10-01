/**
 * Our own spend tracking. Meta's per-message rate is the same whichever
 * provider carries the message, so we price sends ourselves instead of
 * trusting a BSP dashboard. India rates in paise, env-configurable so a
 * Meta rate-card revision needs no deploy.
 *
 * Service conversations: free up to WA_SERVICE_FREE_TIER per number per
 * month. From 1 Oct 2026 Meta charges beyond that allowance, so set
 * WA_RATE_SERVICE_PAISE to the utility rate from then on.
 */
import type { MessageCategory } from "./types";

export function ratesPaise(): Record<MessageCategory, number> {
  const n = (v: string | undefined, d: number) => (v !== undefined && v !== "" && Number.isFinite(Number(v)) ? Number(v) : d);
  return {
    MARKETING: n(process.env.WA_RATE_MARKETING_PAISE, 86),
    UTILITY: n(process.env.WA_RATE_UTILITY_PAISE, 13),
    AUTHENTICATION: n(process.env.WA_RATE_AUTH_PAISE, 13),
    SERVICE: n(process.env.WA_RATE_SERVICE_PAISE, 0),
  };
}

export function serviceFreeTier(): number {
  const v = Number(process.env.WA_SERVICE_FREE_TIER ?? 1000);
  return Number.isFinite(v) && v >= 0 ? v : 1000;
}

/**
 * Estimated cost of one successful send. A service message is free while this
 * month's service conversations are within the allowance.
 */
export function estimateCostPaise(category: MessageCategory, serviceConversationsThisMonth = 0): number {
  if (category === "SERVICE") return serviceConversationsThisMonth >= serviceFreeTier() ? ratesPaise().SERVICE : 0;
  return ratesPaise()[category];
}

export function formatRupees(paise: number): string {
  const rupees = paise / 100;
  return `₹${rupees.toLocaleString("en-IN", { maximumFractionDigits: rupees < 100 ? 2 : 0 })}`;
}

/** Start of the current calendar month in IST, as a UTC Date (DB timestamps are UTC). */
export function monthStartIST(now = new Date()): Date {
  const ist = new Date(now.getTime() + 330 * 60_000);
  return new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), 1) - 330 * 60_000);
}
