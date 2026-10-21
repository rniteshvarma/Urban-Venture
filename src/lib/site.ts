/** The public site's base URL, for sitemaps, canonical links and structured data. */
export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000").replace(/\/$/, "");
}

/** A JSON-LD payload safe to put in a <script> tag (no "</script>" breakout). */
export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

/** Projects a visitor can open: active, published and (for seller listings) approved. */
export const PUBLIC_PROJECT = { status: "ACTIVE", reviewState: "PUBLISHED", listingStatus: "APPROVED" } as const;
