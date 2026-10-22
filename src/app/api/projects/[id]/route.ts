import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { gradeFor } from "@/lib/listings/score";
import { gradeOf } from "@/lib/inventory/rating";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canView, withoutPrivateFields } from "@/lib/projects/visibility";

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
        // Separate from the rating; from OpenStreetMap places (© OpenStreetMap contributors).
        accessibility: { select: { score: true, confidence: true, components: true, nearest: true, within: true, watchOuts: true, computedAt: true } },
      },
    });

    // Unpublished listings (pending, rejected, paused, archived) exist only for
    // their owner and admins; everyone else gets the same 404 as a missing id.
    const session = await getServerSession(authOptions);
    const viewer = { userId: session?.user?.id ?? null, isAdmin: session?.user?.role === "ADMIN" };
    if (!project || !canView(project, viewer)) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Constraint 7: strip the raw seller score; expose a grade instead.
    // Researched admin inventory exposes Property Tiger's own rating breakdown.
    // Internal review notes, owner id and survey numbers never leave for non-admins.
    const { listingScore, scoreBreakdown } = project;
    const pub = viewer.isAdmin ? project : withoutPrivateFields(project);
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
