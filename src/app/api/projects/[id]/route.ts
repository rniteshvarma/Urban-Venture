import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { gradeFor } from "@/lib/listings/score";
import { gradeOf } from "@/lib/inventory/rating";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        unitTypes: { orderBy: { displayOrder: "asc" } },
        media: {
          where: { isPublic: true, isRejected: false },
          orderBy: { displayOrder: "asc" },
          select: { id: true, fileUrl: true, mediaType: true, altText: true, isPrimary: true },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Constraint 7: strip the raw seller score; expose a grade instead.
    // Researched admin inventory exposes Property Tiger's own rating breakdown.
    const { listingScore, scoreBreakdown, ...pub } = project;
    const isInventory = project.listingSource === "ADMIN" && project.sourceType === "CSV_IMPORT" && listingScore != null;
    return NextResponse.json({
      ...pub,
      isVerifiedInventory: project.listingSource === "ADMIN",
      listingGrade: project.listingSource === "SELLER" && listingScore != null ? gradeFor(listingScore) : null,
      inventoryScore: isInventory ? listingScore : null,
      inventoryGrade: isInventory ? gradeOf(listingScore!) : null,
      inventoryRating: isInventory ? scoreBreakdown : null,
    });
  } catch (error) {
    console.error(`Error fetching project ${id}:`, error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
