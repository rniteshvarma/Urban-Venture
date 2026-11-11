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

/**
 * Title, description, canonical link and social preview for a public page.
 * `path` starts with "/" ("" for the homepage). Titles are written in full —
 * the root layout has no title template.
 */
export function pageMeta(path: string, title: string, description: string, opts: { noindex?: boolean } = {}): import("next").Metadata {
  const url = `${siteUrl()}${path}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: "Property Tiger", locale: "en_IN", type: "website" },
    ...(opts.noindex ? { robots: { index: false, follow: true } } : {}),
  };
}
