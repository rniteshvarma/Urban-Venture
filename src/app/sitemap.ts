import type { MetadataRoute } from "next";
import prisma from "@/lib/prisma";
import { PUBLIC_PROJECT, siteUrl } from "@/lib/site";

// Rebuilt at most once a day; the catalogue and corridors change daily at most.
export const revalidate = 86400;

const STATIC: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
  { path: "", priority: 1, changeFrequency: "daily" },
  { path: "/projects", priority: 0.9, changeFrequency: "daily" },
  { path: "/market", priority: 0.9, changeFrequency: "weekly" },
  { path: "/developers", priority: 0.8, changeFrequency: "weekly" },
  { path: "/market/forecast", priority: 0.7, changeFrequency: "weekly" },
  { path: "/market/compare", priority: 0.6, changeFrequency: "weekly" },
  { path: "/market/approvals", priority: 0.6, changeFrequency: "weekly" },
  { path: "/market/legal", priority: 0.6, changeFrequency: "monthly" },
  { path: "/explore", priority: 0.6, changeFrequency: "weekly" },
  { path: "/news", priority: 0.6, changeFrequency: "daily" },
  { path: "/research", priority: 0.6, changeFrequency: "monthly" },
  { path: "/calculator", priority: 0.5, changeFrequency: "monthly" },
  { path: "/legal/privacy", priority: 0.2, changeFrequency: "yearly" },
  { path: "/legal/terms", priority: 0.2, changeFrequency: "yearly" },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const [corridors, projects, developers] = await Promise.all([
    prisma.corridorProfile.findMany({ where: { isPublished: true }, select: { slug: true, updatedAt: true } }),
    prisma.project.findMany({ where: PUBLIC_PROJECT, select: { id: true, updatedAt: true } }),
    prisma.developer.findMany({ select: { slug: true, computedAt: true } }),
  ]).catch(() => [[], [], []] as const);
  return [
    ...STATIC.map((s) => ({ url: `${base}${s.path}`, changeFrequency: s.changeFrequency, priority: s.priority })),
    ...corridors.map((c) => ({ url: `${base}/market/${c.slug}`, lastModified: c.updatedAt, changeFrequency: "weekly" as const, priority: 0.8 })),
    ...projects.map((p) => ({ url: `${base}/projects/${p.id}`, lastModified: p.updatedAt, changeFrequency: "weekly" as const, priority: 0.7 })),
    ...developers.map((d) => ({ url: `${base}/developers/${d.slug}`, lastModified: d.computedAt, changeFrequency: "weekly" as const, priority: 0.6 })),
  ];
}
