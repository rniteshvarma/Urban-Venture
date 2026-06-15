import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { ApprovalType, ApprovalAuth, ApprovalStatus } from "@prisma/client";

const approvalSchema = z.object({
  projectName: z.string().min(1),
  developerName: z.string().optional().nullable(),
  approvalType: z.nativeEnum(ApprovalType),
  authority: z.nativeEnum(ApprovalAuth),
  approvalNumber: z.string().optional().nullable(),
  approvalDate: z.string().optional().nullable().transform(val => val ? new Date(val) : null),
  corridor: z.string().optional().nullable(),
  areaAcres: z.number().positive().optional().nullable(),
  surveyNumbers: z.array(z.string()).default([]),
  status: z.nativeEnum(ApprovalStatus).default("APPROVED"),
  reraNumber: z.string().optional().nullable(),
  reraUrl: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  isPublished: z.boolean().default(true),
});

// GET /api/admin/approvals - List all approvals with optional filters
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");
    const corridor = searchParams.get("corridor");
    const authority = searchParams.get("authority");

    const where: any = {};

    if (corridor && corridor !== "ALL") {
      where.corridor = corridor;
    }

    if (authority && authority !== "ALL") {
      where.authority = authority as ApprovalAuth;
    }

    if (search) {
      where.OR = [
        { projectName: { contains: search, mode: "insensitive" } },
        { developerName: { contains: search, mode: "insensitive" } },
        { approvalNumber: { contains: search, mode: "insensitive" } },
      ];
    }

    const approvals = await prisma.approvalRecord.findMany({
      where,
      orderBy: { approvalDate: "desc" }
    });

    return NextResponse.json(approvals);
  } catch (error: any) {
    console.error("Error in GET /api/admin/approvals:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}

// POST /api/admin/approvals - Create a new approval record
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parse = approvalSchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json({ error: "Invalid input data", details: parse.error.format() }, { status: 400 });
    }

    const approval = await prisma.approvalRecord.create({
      data: parse.data
    });

    return NextResponse.json({ success: true, approval });
  } catch (error: any) {
    console.error("Error in POST /api/admin/approvals:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
