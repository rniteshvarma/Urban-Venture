import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/portal", "/dashboard", "/login", "/signup", "/report/", "/reports/"] }],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
