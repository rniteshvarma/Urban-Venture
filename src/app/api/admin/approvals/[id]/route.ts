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

// GET /api/admin/approvals/[id] - Read single approval
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;

    const approval = await prisma.approvalRecord.findUnique({
      where: { id }
    });

    if (!approval) {
      return NextResponse.json({ error: "Approval record not found" }, { status: 404 });
    }

    return NextResponse.json(approval);
  } catch (error: any) {
    console.error("Error in GET /api/admin/approvals/[id]:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}

// PUT /api/admin/approvals/[id] - Update single approval
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;

    const body = await req.json();
    const parse = approvalSchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json({ error: "Invalid input data", details: parse.error.format() }, { status: 400 });
    }

    const updated = await prisma.approvalRecord.update({
      where: { id },
      data: parse.data
    });

    return NextResponse.json({ success: true, approval: updated });
  } catch (error: any) {
    console.error("Error in PUT /api/admin/approvals/[id]:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}

// DELETE /api/admin/approvals/[id] - Delete single approval
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;

    await prisma.approvalRecord.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error in DELETE /api/admin/approvals/[id]:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
