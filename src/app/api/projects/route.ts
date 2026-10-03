import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { gradeFor } from "@/lib/listings/score";
import { gradeOf } from "@/lib/inventory/rating";

// Card-sized projection: the feed can hold hundreds of projects, so the heavy
// columns (unit tables, media, provenance) stay on the detail endpoint.
const CARD_SELECT = {
  id: true, name: true, developer: true, corridor: true, city: true,
  minBudgetLakhs: true, maxBudgetLakhs: true, minHorizonYears: true, maxHorizonYears: true,
  riskLevel: true, propertyType: true, infraHighlights: true, imageUrls: true, status: true,
  createdAt: true, possessionText: true, reraNumber: true, latitude: true, longitude: true,
  listingSource: true, sourceType: true, listingScore: true, specifications: true,
} satisfies Prisma.ProjectSelect;

// The type chips speak in buyer terms; older rows stored "Residential" for flats.
const TYPE_ALIASES: Record<string, string[]> = {
  Apartment: ["Apartment", "Residential"],
  Residential: ["Apartment", "Residential"],
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    // Parse filter parameters
    const corridor = searchParams.get("corridor");
    const minBudgetStr = searchParams.get("minBudget");
    const maxBudgetStr = searchParams.get("maxBudget");
    const risk = searchParams.get("risk");
    const propertyType = searchParams.get("type");
    const city = searchParams.get("city");
    const q = searchParams.get("q")?.trim();
    // An exact locality picked from the search suggestions ("Narsingi").
    const locality = searchParams.get("locality")?.trim();
    const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 0, 0), 2000) || undefined;
    const status = searchParams.get("status") || "ACTIVE"; // default is ACTIVE for public

    const where: Prisma.ProjectWhereInput = {};
    const and: Prisma.ProjectWhereInput[] = [];

    if (status !== "ALL") {
      where.status = status as Prisma.EnumProjectStatusFilter["equals"];
    }

    if (corridor) {
      where.corridor = corridor;
    }

    if (city) {
      where.city = city;
    }

    if (risk) {
      where.riskLevel = risk as Prisma.EnumRiskLevelFilter["equals"];
    }

    if (propertyType) {
      where.propertyType = { in: TYPE_ALIASES[propertyType] ?? [propertyType] };
    }

    if (q) {
      and.push({
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { developer: { contains: q, mode: "insensitive" } },
          { corridor: { contains: q, mode: "insensitive" } },
          { addressLine: { contains: q, mode: "insensitive" } },
          // A locality picked from the search suggestions (stored exactly as listed).
          { specifications: { path: ["locality"], equals: q } },
          { specifications: { path: ["subLocality"], equals: q } },
        ],
      });
    }

    if (locality) and.push({ specifications: { path: ["locality"], equals: locality } });

    // Budget filtering logic: check if the project budget range overlaps with the queried budget range
    if (minBudgetStr || maxBudgetStr) {
      const queryMin = minBudgetStr ? parseFloat(minBudgetStr) : 0;
      const queryMax = maxBudgetStr ? parseFloat(maxBudgetStr) : 999999;
      and.push({ minBudgetLakhs: { lte: queryMax } }, { maxBudgetLakhs: { gte: queryMin } });
    }
    if (and.length) where.AND = and;

    // Seller Mode: never surface low-quality seller listings in the default feed.
    // (Non-approved seller listings are already excluded — their ProjectStatus is
    // not ACTIVE — so the status filter above handles them.)
    where.NOT = { listingSource: "SELLER", listingScore: { lt: 40 } };

    const projects = await prisma.project.findMany({
      where,
      select: CARD_SELECT,
      // Ranking (Part 4.3): ADMIN inventory first (ADMIN < SELLER), then listing
      // score desc, then recency. All-admin feeds fall through to createdAt desc,
      // preserving the previous ordering.
      orderBy: [{ listingSource: "asc" }, { listingScore: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
      take: limit,
    });

    // Constraint 7: never expose the raw seller score publicly — a grade (A/B/C)
    // communicates the same thing without inviting arguments. Researched admin
    // inventory carries Property Tiger's own rating, which is public by design.
    const publicProjects = projects.map(({ listingScore, specifications, sourceType, imageUrls, ...p }) => {
      const isInventory = p.listingSource === "ADMIN" && sourceType === "CSV_IMPORT" && listingScore != null;
      const spec = (specifications ?? {}) as { locality?: string };
      return {
        ...p,
        imageUrls: imageUrls.slice(0, 1),
        locality: spec.locality ?? null,
        isVerifiedInventory: p.listingSource === "ADMIN",
        listingGrade: p.listingSource === "SELLER" && listingScore != null ? gradeFor(listingScore) : null,
        inventoryScore: isInventory ? listingScore : null,
        inventoryGrade: isInventory ? gradeOf(listingScore!) : null,
      };
    });

    return NextResponse.json(publicProjects);
  } catch (error) {
    console.error("Error fetching projects:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
