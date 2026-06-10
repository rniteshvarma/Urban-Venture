import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

const projectSchema = z.object({
  name: z.string().min(1),
  developer: z.string().min(1),
  corridor: z.string().min(1),
  city: z.string().default("Hyderabad"),
  minBudgetLakhs: z.number().positive(),
  maxBudgetLakhs: z.number().positive(),
  minHorizonYears: z.number().int().positive(),
  maxHorizonYears: z.number().int().positive(),
  riskLevel: z.enum(["LOW", "MEDIUM", "HIGH"]),
  propertyType: z.string().min(1),
  infraHighlights: z.array(z.string()).default([]),
  exitOpportunities: z.array(z.string()).default([]),
  comparables: z.array(z.string()).default([]),
  description: z.string().min(1),
  brochureUrl: z.string().optional().nullable(),
  imageUrls: z.array(z.string()).default([]),
  status: z.enum(["ACTIVE", "SOLD_OUT", "UPCOMING", "ARCHIVED"]).default("ACTIVE"),
});

// GET /api/admin/projects - List all projects with optional filter
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");
    const status = searchParams.get("status");

    const where: any = {};

    if (status && status !== "ALL") {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { developer: { contains: search, mode: "insensitive" } },
        { corridor: { contains: search, mode: "insensitive" } },
      ];
    }

    const projects = await prisma.project.findMany({
      where,
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(projects);
  } catch (error: any) {
    console.error("Error in GET /api/admin/projects:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}

// POST /api/admin/projects - Create a new project
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parse = projectSchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json({ error: "Invalid input data", details: parse.error.format() }, { status: 400 });
    }

    const project = await prisma.project.create({
      data: parse.data
    });

    return NextResponse.json({ success: true, project });
  } catch (error: any) {
    console.error("Error in POST /api/admin/projects:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
