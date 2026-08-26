import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { gradeFor } from "@/lib/listings/score";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const project = await prisma.project.findUnique({
      where: { id }
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Constraint 7: strip the raw seller score; expose a grade instead.
    const { listingScore, scoreBreakdown, ...pub } = project;
    return NextResponse.json({
      ...pub,
      isVerifiedInventory: project.listingSource === "ADMIN",
      listingGrade: project.listingSource === "SELLER" && listingScore != null ? gradeFor(listingScore) : null,
    });
  } catch (error: any) {
    console.error(`Error fetching project ${id}:`, error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
