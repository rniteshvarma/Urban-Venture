import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { gradeFor } from "@/lib/listings/score";

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
    const status = searchParams.get("status") || "ACTIVE"; // default is ACTIVE for public

    const where: any = {};

    if (status !== "ALL") {
      where.status = status;
    }

    if (corridor) {
      where.corridor = corridor;
    }

    if (city) {
      where.city = city;
    }

    if (risk) {
      where.riskLevel = risk;
    }

    if (propertyType) {
      where.propertyType = propertyType;
    }

    // Budget filtering logic: check if the project budget range overlaps with the queried budget range
    if (minBudgetStr || maxBudgetStr) {
      const queryMin = minBudgetStr ? parseFloat(minBudgetStr) : 0;
      const queryMax = maxBudgetStr ? parseFloat(maxBudgetStr) : 999999;
      
      where.AND = [
        { minBudgetLakhs: { lte: queryMax } },
        { maxBudgetLakhs: { gte: queryMin } }
      ];
    }

    // Seller Mode: never surface low-quality seller listings in the default feed.
    // (Non-approved seller listings are already excluded — their ProjectStatus is
    // not ACTIVE — so the status filter above handles them.)
    where.NOT = { listingSource: "SELLER", listingScore: { lt: 40 } };

    const projects = await prisma.project.findMany({
      where,
      // Ranking (Part 4.3): ADMIN inventory first (ADMIN < SELLER), then listing
      // score desc, then recency. All-admin feeds fall through to createdAt desc,
      // preserving the previous ordering.
      orderBy: [{ listingSource: "asc" }, { listingScore: "desc" }, { createdAt: "desc" }],
    });

    // Constraint 7: never expose the raw seller score publicly — a grade (A/B/C)
    // communicates the same thing without inviting arguments. Strip the internal
    // fields; add `listingGrade` + `isVerifiedInventory` for the UI.
    const publicProjects = projects.map(({ listingScore, scoreBreakdown, ...p }) => ({
      ...p,
      isVerifiedInventory: p.listingSource === "ADMIN",
      listingGrade: p.listingSource === "SELLER" && listingScore != null ? gradeFor(listingScore) : null,
    }));

    return NextResponse.json(publicProjects);
  } catch (error: any) {
    console.error("Error fetching projects:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
