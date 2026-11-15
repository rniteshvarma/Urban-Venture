/**
 * Public trust facts. Everything here is either set by the business in env
 * vars (and only shown when set) or computed from our own data — nothing is
 * written into the code as a claim.
 *
 *   NEXT_PUBLIC_RERA_AGENT_NUMBER     TG-RERA real estate agent registration number
 *   NEXT_PUBLIC_GOOGLE_RATING         star rating shown on our Google Business profile, e.g. 4.8
 *   NEXT_PUBLIC_GOOGLE_REVIEW_COUNT   number of Google reviews behind it
 *   NEXT_PUBLIC_GOOGLE_REVIEWS_URL    link to the Google profile's reviews
 */

/** How we are paid — confirmed by the business owner (Nov 2026). Keep in sync with the Terms. */
export const HOW_WE_EARN = {
  short: "Free for buyers. Builders pay us only when a sale closes.",
  long: "You never pay us. When you buy a project through us, the builder pays us a fee after the sale closes. If you don't buy, nobody pays.",
  noPaidPlacements: "No paid placements: builders can't pay for a higher rank or a better score. Every listing is scored by the same rules.",
} as const;

export const TG_RERA_SITE = "https://rera.telangana.gov.in";

export interface PublicProof {
  reraAgentNumber: string | null;
  google: { rating: number; reviews: number; url: string | null } | null;
}

export function publicProof(env: Record<string, string | undefined> = {
  NEXT_PUBLIC_RERA_AGENT_NUMBER: process.env.NEXT_PUBLIC_RERA_AGENT_NUMBER,
  NEXT_PUBLIC_GOOGLE_RATING: process.env.NEXT_PUBLIC_GOOGLE_RATING,
  NEXT_PUBLIC_GOOGLE_REVIEW_COUNT: process.env.NEXT_PUBLIC_GOOGLE_REVIEW_COUNT,
  NEXT_PUBLIC_GOOGLE_REVIEWS_URL: process.env.NEXT_PUBLIC_GOOGLE_REVIEWS_URL,
}): PublicProof {
  const rera = env.NEXT_PUBLIC_RERA_AGENT_NUMBER?.trim() || null;
  const rating = Number(env.NEXT_PUBLIC_GOOGLE_RATING);
  const reviews = Number(env.NEXT_PUBLIC_GOOGLE_REVIEW_COUNT);
  const url = env.NEXT_PUBLIC_GOOGLE_REVIEWS_URL?.trim();
  // A rating is shown only with its review count; a bad value hides it rather than showing nonsense.
  const google = Number.isFinite(rating) && rating >= 1 && rating <= 5 && Number.isInteger(reviews) && reviews > 0
    ? { rating: Math.round(rating * 10) / 10, reviews, url: url && /^https:\/\//.test(url) ? url : null }
    : null;
  return { reraAgentNumber: rera, google };
}
