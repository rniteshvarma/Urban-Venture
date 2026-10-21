/**
 * Server shell for the (client-rendered) project page: its title, description,
 * canonical link and schema.org structured data, so search engines see the
 * project without running JavaScript.
 */
import type { Metadata } from "next";
import prisma from "@/lib/prisma";
import { jsonLd, PUBLIC_PROJECT, siteUrl } from "@/lib/site";

const load = (id: string) =>
  prisma.project.findFirst({
    where: { id, ...PUBLIC_PROJECT },
    select: { id: true, name: true, developer: true, developerSlug: true, specifications: true, corridor: true, city: true, propertyType: true, description: true, addressLine: true, reraNumber: true, minBudgetLakhs: true, maxBudgetLakhs: true, imageUrls: true, latitude: true, longitude: true },
  });

const lakhs = (n: number) => (n >= 100 ? `₹${(n / 100).toFixed(2).replace(/\.?0+$/, "")} Cr` : `₹${Math.round(n)} L`);

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const p = await load(id).catch(() => null);
  if (!p) return { title: "Project | Property Tiger" };
  const price = p.minBudgetLakhs > 0 ? ` · ${lakhs(p.minBudgetLakhs)}${p.maxBudgetLakhs > p.minBudgetLakhs ? `–${lakhs(p.maxBudgetLakhs)}` : ""}` : "";
  const isLand = (p.specifications as { listingKind?: string } | null)?.listingKind === "LAND_LISTING";
  const title = isLand ? `${p.name} for sale | Property Tiger` : `${p.name} by ${p.developer}, ${p.corridor} | Property Tiger`;
  const description = isLand
    ? `${p.name}${price}. Individual land listing (not RERA) — location, asking price and the checks to make before buying.`
    : `${p.propertyType} in ${p.corridor}, ${p.city}${price}${p.reraNumber ? ` · TG-RERA ${p.reraNumber}` : ""}. Prices, units, delivery record and nearby infrastructure.`;
  return {
    title,
    description,
    alternates: { canonical: `${siteUrl()}/projects/${p.id}` },
    openGraph: { title, description, url: `${siteUrl()}/projects/${p.id}`, images: p.imageUrls.slice(0, 1) },
  };
}

export default async function ProjectLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await load(id).catch(() => null);
  const data = p && {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: p.name,
    url: `${siteUrl()}/projects/${p.id}`,
    description: p.description?.slice(0, 500) || undefined,
    image: p.imageUrls.slice(0, 3),
    about: {
      "@type": "Place",
      name: p.name,
      address: { "@type": "PostalAddress", streetAddress: p.addressLine ?? undefined, addressLocality: p.corridor, addressRegion: "Telangana", addressCountry: "IN" },
      ...(p.latitude != null && p.longitude != null ? { geo: { "@type": "GeoCoordinates", latitude: p.latitude, longitude: p.longitude } } : {}),
    },
    ...(p.minBudgetLakhs > 0
      ? { offers: { "@type": "AggregateOffer", priceCurrency: "INR", lowPrice: Math.round(p.minBudgetLakhs * 100_000), highPrice: Math.round(Math.max(p.minBudgetLakhs, p.maxBudgetLakhs) * 100_000), offeredBy: { "@type": "Organization", name: p.developer, ...(p.developerSlug ? { url: `${siteUrl()}/developers/${p.developerSlug}` } : {}) } } }
      : {}),
    ...(p.reraNumber ? { identifier: { "@type": "PropertyValue", propertyID: "TG-RERA", value: p.reraNumber } } : {}),
  };
  return (
    <>
      {data && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(data) }} />}
      {children}
    </>
  );
}
