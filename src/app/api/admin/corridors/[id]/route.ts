import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { RiskLevel } from "@prisma/client";

const corridorMetricUpdateSchema = z.object({
  corridor: z.string().min(1).optional(),
  city: z.string().optional(),
  historicalCAGR: z.number().positive().optional(),
  projectedCAGRMin: z.number().positive().optional(),
  projectedCAGRMax: z.number().positive().optional(),
  rentalYieldMin: z.number().nonnegative().optional(),
  rentalYieldMax: z.number().nonnegative().optional(),
  infraScore: z.number().int().min(1).max(10).optional(),
  demandScore: z.number().int().min(1).max(10).optional(),
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
    const corridor = await prisma.corridorMetrics.update({
      where: { id },
      data: {
        ...data,
        updatedBy: session.user.email
      }
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

    await prisma.corridorMetrics.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: "Corridor metric deleted successfully" });
  } catch (error: any) {
    console.error(`Error in DELETE /api/admin/corridors/${id}:`, error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
