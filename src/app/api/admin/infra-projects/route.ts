import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { InfraCategory, InfraStatus } from "@prisma/client";

const projectSchema = z.object({
  name: z.string().min(1),
  shortName: z.string().min(1),
  category: z.nativeEnum(InfraCategory),
  subCategory: z.string().optional().nullable(),
  description: z.string().min(1),
  status: z.nativeEnum(InfraStatus),
  completionPct: z.number().int().min(0).max(100).default(0),
  estimatedCompletion: z.string().optional().nullable(),
  totalInvestmentCr: z.number().positive().optional().nullable(),
  expectedJobs: z.number().int().positive().optional().nullable(),
  affectedCorridors: z.array(z.string()).default([]),
  impactRadius: z.number().min(1).max(50).default(10),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  sourceUrl: z.string().optional().nullable(),
  sourceGO: z.string().optional().nullable(),
  tags: z.array(z.string()).default([]),
  approvalAuthority: z.string().optional().nullable(),
  reImpactScore: z.number().int().min(1).max(10).default(5),
  isPublished: z.boolean().default(false),
});

// GET /api/admin/infra-projects - List all projects with optional filters
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const status = searchParams.get("status");
    const corridor = searchParams.get("corridor");

    const where: any = {};

    if (category && category !== "ALL") {
      where.category = category as InfraCategory;
    }

    if (status && status !== "ALL") {
      where.status = status as InfraStatus;
    }

    if (corridor && corridor !== "ALL") {
      where.affectedCorridors = {
        has: corridor
      };
    }

    const projects = await prisma.infraProject.findMany({
      where,
      include: {
        milestones: {
          orderBy: {
            date: "asc"
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return NextResponse.json(projects);
  } catch (error: any) {
    console.error("Error in GET /api/admin/infra-projects:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}

// POST /api/admin/infra-projects - Create a new project
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

    const project = await prisma.infraProject.create({
      data: parse.data
    });

    return NextResponse.json({ success: true, project });
  } catch (error: any) {
    console.error("Error in POST /api/admin/infra-projects:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
