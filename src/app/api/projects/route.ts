import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { filtersFromParams, projectWhere } from "@/lib/projects/query";
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

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 0, 0), 2000) || undefined;
    const where = projectWhere(filtersFromParams(searchParams));

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
      const spec = (specifications ?? {}) as { locality?: string; listingKind?: string };
      return {
        ...p,
        imageUrls: imageUrls.slice(0, 1),
        locality: spec.locality ?? null,
        listingKind: spec.listingKind ?? "PROJECT",
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
