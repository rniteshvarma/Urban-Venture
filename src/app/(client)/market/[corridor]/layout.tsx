/**
 * Server shell for the (client-rendered) corridor page: title, description
 * from measured figures, canonical link and schema.org Place data.
 */
import type { Metadata } from "next";
import prisma from "@/lib/prisma";
import { jsonLd, siteUrl } from "@/lib/site";

const load = (slug: string) =>
  prisma.corridorProfile.findFirst({
    where: { slug, isPublished: true },
    select: { slug: true, name: true, shortName: true, description: true, adminNote: true, centroidLat: true, centroidLng: true, district: true },
  });

export async function generateMetadata({ params }: { params: Promise<{ corridor: string }> }): Promise<Metadata> {
  const { corridor } = await params;
  const c = await load(decodeURIComponent(corridor)).catch(() => null);
  if (!c) return { title: "Corridor | Property Tiger" };
  const title = `${c.shortName || c.name} property prices, infrastructure & outlook | Property Tiger`;
  const description = (c.adminNote || c.description).slice(0, 300);
  return { title, description, alternates: { canonical: `${siteUrl()}/market/${c.slug}` }, openGraph: { title, description, url: `${siteUrl()}/market/${c.slug}` } };
}

export default async function CorridorLayout({ children, params }: { children: React.ReactNode; params: Promise<{ corridor: string }> }) {
  const { corridor } = await params;
  const c = await load(decodeURIComponent(corridor)).catch(() => null);
  const data = c && {
    "@context": "https://schema.org",
    "@type": "Place",
    name: c.name,
    url: `${siteUrl()}/market/${c.slug}`,
    description: c.description,
    address: { "@type": "PostalAddress", addressLocality: c.shortName || c.name, addressRegion: "Telangana", addressCountry: "IN" },
    containedInPlace: { "@type": "City", name: "Hyderabad" },
    ...(c.centroidLat != null && c.centroidLng != null ? { geo: { "@type": "GeoCoordinates", latitude: c.centroidLat, longitude: c.centroidLng } } : {}),
  };
  return (
    <>
      {data && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(data) }} />}
      {children}
    </>
  );
}
