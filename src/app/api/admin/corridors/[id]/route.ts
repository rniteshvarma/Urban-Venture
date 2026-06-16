import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { RiskLevel } from "@prisma/client";

const corridorMetricUpdateSchema = z.object({
  corridor: z.string().min(1).optional(), // Acts as slug
  historicalCAGR: z.number().positive().optional(),
  projectedCAGRMin: z.number().positive().optional(),
  projectedCAGRMax: z.number().positive().optional(),
  rentalYieldMin: z.number().nonnegative().optional(),
  rentalYieldMax: z.number().nonnegative().optional(),
  riskLevel: z.nativeEnum(RiskLevel).optional()
});

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parse = corridorMetricUpdateSchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json({ error: "Invalid input data", details: parse.error.format() }, { status: 400 });
    }

    const data = parse.data;
    const mappedData: any = {};
    if (data.corridor) mappedData.slug = data.corridor.toLowerCase().replace(/\s+/g, "-");
    if (data.historicalCAGR !== undefined) mappedData.historicalCAGR = data.historicalCAGR;
    if (data.projectedCAGRMin !== undefined) mappedData.projectedCAGRMin = data.projectedCAGRMin;
    if (data.projectedCAGRMax !== undefined) mappedData.projectedCAGRMax = data.projectedCAGRMax;
    if (data.rentalYieldMin !== undefined) mappedData.rentalYieldMin = data.rentalYieldMin;
    if (data.rentalYieldMax !== undefined) mappedData.rentalYieldMax = data.rentalYieldMax;
    if (data.riskLevel !== undefined) mappedData.riskLevel = data.riskLevel;

    const corridor = await prisma.corridorProfile.update({
      where: { id },
      data: mappedData
    });

    return NextResponse.json({ success: true, corridor });
  } catch (error: any) {
    console.error(`Error in PUT /api/admin/corridors/${id}:`, error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.corridorProfile.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: "Corridor profile deleted successfully" });
  } catch (error: any) {
    console.error(`Error in DELETE /api/admin/corridors/${id}:`, error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
