import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { RiskLevel, Direction, HeatRating, InvCycle } from "@prisma/client";

const corridorMetricSchema = z.object({
  corridor: z.string().min(1), // Acts as slug
  name: z.string().optional(),
  shortName: z.string().optional(),
  city: z.string().default("Hyderabad"),
  historicalCAGR: z.number().positive(),
  projectedCAGRMin: z.number().positive(),
  projectedCAGRMax: z.number().positive(),
  rentalYieldMin: z.number().nonnegative(),
  rentalYieldMax: z.number().nonnegative(),
  riskLevel: z.nativeEnum(RiskLevel)
});

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const corridors = await prisma.corridorProfile.findMany({
      orderBy: { name: "asc" }
    });

    // Format response to maintain backwards compatibility
    const formatted = corridors.map(c => ({
      id: c.id,
      corridor: c.slug,
      name: c.name,
      shortName: c.shortName,
      city: "Hyderabad",
      historicalCAGR: c.historicalCAGR,
      projectedCAGRMin: c.projectedCAGRMin,
      projectedCAGRMax: c.projectedCAGRMax,
      rentalYieldMin: c.rentalYieldMin,
      rentalYieldMax: c.rentalYieldMax,
      riskLevel: c.riskLevel,
      overallScore: c.overallScore || 0
    }));

    return NextResponse.json({ success: true, corridors: formatted });
  } catch (error: any) {
    console.error("Error in GET /api/admin/corridors:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parse = corridorMetricSchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json({ error: "Invalid input data", details: parse.error.format() }, { status: 400 });
    }

    const data = parse.data;
    const corridor = await prisma.corridorProfile.create({
      data: {
        slug: data.corridor.toLowerCase().replace(/\s+/g, "-"),
        name: data.name || data.corridor,
        shortName: data.shortName || data.corridor,
        direction: Direction.SOUTH,
        zone: "South Outer Ring Road",
        district: "Ranga Reddy",
        description: "Admin added corridor profile.",
        heatRating: HeatRating.HOT,
        investmentCycle: InvCycle.ACT_NOW,
        historicalCAGR: data.historicalCAGR,
        projectedCAGRMin: data.projectedCAGRMin,
        projectedCAGRMax: data.projectedCAGRMax,
        rentalYieldMin: data.rentalYieldMin,
        rentalYieldMax: data.rentalYieldMax,
        riskLevel: data.riskLevel,
        isPublished: true
      }
    });

    return NextResponse.json({ 
      success: true, 
      corridor: {
        id: corridor.id,
        corridor: corridor.slug,
        city: "Hyderabad",
        historicalCAGR: corridor.historicalCAGR,
        projectedCAGRMin: corridor.projectedCAGRMin,
        projectedCAGRMax: corridor.projectedCAGRMax,
        rentalYieldMin: corridor.rentalYieldMin,
        rentalYieldMax: corridor.rentalYieldMax,
        riskLevel: corridor.riskLevel
      } 
    });
  } catch (error: any) {
    console.error("Error in POST /api/admin/corridors:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
