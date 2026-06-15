import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

const appreciationSchema = z.object({
  corridor: z.string().min(1),
  year: z.number().int().min(2000).max(2100),
  quarter: z.number().int().min(1).max(4).optional().nullable(),
  pricePerSqFt: z.number().positive(),
  pricePerSqYd: z.number().positive().optional().nullable(),
  source: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

// GET /api/admin/appreciation - List all data points
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const points = await prisma.appreciationHistory.findMany({
      orderBy: [
        { corridor: "asc" },
        { year: "desc" },
        { quarter: "desc" }
      ]
    });

    return NextResponse.json(points);
  } catch (error: any) {
    console.error("Error in GET /api/admin/appreciation:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}

// POST /api/admin/appreciation - Create data point & calculate YoY/QoQ changes
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parse = appreciationSchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json({ error: "Invalid input data", details: parse.error.format() }, { status: 400 });
    }

    const { corridor, year, quarter, pricePerSqFt } = parse.data;

    // 1. Calculate YoY Change
    // Look for previous year's record for the same corridor & quarter
    let yoyChange = 0;
    const prevYearRecord = await prisma.appreciationHistory.findFirst({
      where: {
        corridor,
        year: year - 1,
        quarter: quarter || null
      }
    });

    if (prevYearRecord) {
      yoyChange = parseFloat((((pricePerSqFt - prevYearRecord.pricePerSqFt) / prevYearRecord.pricePerSqFt) * 100).toFixed(2));
    }

    // 2. Calculate QoQ Change
    let qoqChange: number | null = null;
    if (quarter) {
      let prevQ = quarter - 1;
      let prevY = year;
      if (prevQ === 0) {
        prevQ = 4;
        prevY = year - 1;
      }

      const prevQRecord = await prisma.appreciationHistory.findFirst({
        where: {
          corridor,
          year: prevY,
          quarter: prevQ
        }
      });

      if (prevQRecord) {
        qoqChange = parseFloat((((pricePerSqFt - prevQRecord.pricePerSqFt) / prevQRecord.pricePerSqFt) * 100).toFixed(2));
      }
    }

    // Upsert or Create record
    const existing = await prisma.appreciationHistory.findFirst({
      where: {
        corridor,
        year,
        quarter: quarter || null
      }
    });

    let record;
    if (existing) {
      record = await prisma.appreciationHistory.update({
        where: { id: existing.id },
        data: {
          ...parse.data,
          yoyChange,
          qoqChange
        }
      });
    } else {
      record = await prisma.appreciationHistory.create({
        data: {
          ...parse.data,
          yoyChange,
          qoqChange
        }
      });
    }

    return NextResponse.json({ success: true, record });
  } catch (error: any) {
    console.error("Error in POST /api/admin/appreciation:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
