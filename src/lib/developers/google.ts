/**
 * Validation for a builder's Google rating, typed in by an admin from the
 * builder's public Google Business profile. Pure: tested in google.test.ts.
 */
export interface GoogleRatingInput { rating: number; reviews: number; url: string }

const GOOGLE_HOSTS = /^(www\.)?google\.(com|co\.in)$|^maps\.app\.goo\.gl$|^g\.page$|^goo\.gl$/i;

export function parseGoogleRating(body: Record<string, unknown>): { ok: true; value: GoogleRatingInput | null } | { ok: false; error: string } {
  // Clearing: all three empty removes the rating.
  if ((body.rating == null || body.rating === "") && (body.reviews == null || body.reviews === "") && !body.url) return { ok: true, value: null };
  const rating = Number(body.rating);
  const reviews = Number(body.reviews);
  const url = String(body.url ?? "").trim();
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) return { ok: false, error: "Rating must be between 1.0 and 5.0." };
  if (!Number.isInteger(reviews) || reviews < 1) return { ok: false, error: "Enter the number of reviews (a whole number)." };
  let host = "";
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") throw new Error();
    host = u.hostname;
  } catch {
    return { ok: false, error: "Paste the https link to the builder's Google profile." };
  }
  if (!GOOGLE_HOSTS.test(host)) return { ok: false, error: "The link must be a Google Maps or Google Business profile link." };
  return { ok: true, value: { rating: Math.round(rating * 10) / 10, reviews, url } };
}
