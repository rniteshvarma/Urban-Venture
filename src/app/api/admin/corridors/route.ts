import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { RiskLevel } from "@prisma/client";

const corridorMetricSchema = z.object({
  corridor: z.string().min(1),
  city: z.string().default("Hyderabad"),
  historicalCAGR: z.number().positive(),
  projectedCAGRMin: z.number().positive(),
  projectedCAGRMax: z.number().positive(),
  rentalYieldMin: z.number().nonnegative(),
  rentalYieldMax: z.number().nonnegative(),
  infraScore: z.number().int().min(1).max(10),
  demandScore: z.number().int().min(1).max(10),
  riskLevel: z.nativeEnum(RiskLevel)
});

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const corridors = await prisma.corridorMetrics.findMany({
      orderBy: { corridor: "asc" }
    });

    return NextResponse.json({ success: true, corridors });
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
    const corridor = await prisma.corridorMetrics.create({
      data: {
        ...data,
        updatedBy: session.user.email
      }
    });

    return NextResponse.json({ success: true, corridor });
  } catch (error: any) {
    console.error("Error in POST /api/admin/corridors:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
