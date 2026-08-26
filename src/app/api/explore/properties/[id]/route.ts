// GET /api/explore/properties/[id] — payload for the map detail card.
//
// Deliberately narrow: no seller phone, no seller email, no document URLs.
// Contact happens through the existing enquiry flow (Constraint 7).
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { gradeFor } from "@/lib/listings/score";
import { displayArea, tokenForStoredType } from "@/lib/explore/query";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;

    const p = await prisma.project.findFirst({
      where: { id, listingStatus: "APPROVED" },
      select: {
        id: true, name: true, corridor: true, city: true, addressLine: true, landmark: true,
        latitude: true, longitude: true,
        minBudgetLakhs: true, maxBudgetLakhs: true, totalAreaSqYd: true,
        propertyType: true, listingSource: true, listingScore: true,
        approvalStatus: true, approvalNumber: true, approvalVerified: true,
        roadWidthFeet: true, facingOptions: true, ownershipType: true,
        availablePlots: true, totalPlots: true, imageUrls: true,
        // media is used only to top up the carousel with public images
        media: {
          where: { isPublic: true, isRejected: false },
          orderBy: { displayOrder: "asc" },
          select: { fileUrl: true },
          take: 5,
        },
      },
    });

    if (!p) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const corridor = p.corridor
      ? await prisma.corridorProfile.findFirst({
          where: { OR: [{ name: p.corridor }, { shortName: p.corridor }, { slug: p.corridor.toLowerCase() }] },
          select: { slug: true, shortName: true, overallScore: true },
        })
      : null;

    const priceLakh = p.maxBudgetLakhs || p.minBudgetLakhs || 0;
    const area = displayArea(p.totalAreaSqYd);
    const isAdmin = p.listingSource === "ADMIN";

    // Up to 5 images: explicit imageUrls first, topped up from public media.
    const images = Array.from(new Set([...(p.imageUrls ?? []), ...p.media.map((m) => m.fileUrl)])).slice(0, 5);

    const locationParts = [p.landmark, p.addressLine, p.corridor, p.city].filter(Boolean);

    return NextResponse.json({
      id: p.id,
      ref: p.id.slice(0, 12).toUpperCase(),
      name: p.name,
      location: locationParts.join(", "),
      latitude: p.latitude,
      longitude: p.longitude,
      priceLakh,
      areaValue: area?.value ?? null,
      areaUnit: area?.unit ?? null,
      rateValue: area && area.value > 0 ? Math.round((priceLakh * 100000) / area.value) : null,
      rateUnit: area?.unit ?? null,
      propertyType: tokenForStoredType(p.propertyType),
      propertyTypeLabel: p.propertyType,
      images,
      attributes: {
        approachRoad: p.roadWidthFeet ? `${p.roadWidthFeet} ft road` : null,
        facing: p.facingOptions?.length ? p.facingOptions.join(", ") : null,
        approvalStatus: p.approvalStatus,
        approvalVerified: p.approvalVerified,
        ownershipType: p.ownershipType,
        plotsAvailable: p.availablePlots != null && p.totalPlots != null ? `${p.availablePlots} of ${p.totalPlots}` : null,
      },
      isVerified: isAdmin || p.approvalVerified,
      source: p.listingSource,
      scoreGrade: isAdmin ? null : p.listingScore != null ? gradeFor(p.listingScore) : null,
      corridor: corridor ? { slug: corridor.slug, name: corridor.shortName, score: corridor.overallScore } : null,
      url: `/projects/${p.id}`,
    });
  } catch (error) {
    console.error("GET /api/explore/properties/[id]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
