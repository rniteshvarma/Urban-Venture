import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

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

    const projects = await prisma.project.findMany({
      where,
      orderBy: {
        createdAt: "desc"
      }
    });

    return NextResponse.json(projects);
  } catch (error: any) {
    console.error("Error fetching projects:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
