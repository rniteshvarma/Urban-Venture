import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

const leadUpdateSchema = z.object({
  status: z.enum(["NEW", "CONTACTED", "INTERESTED", "NEGOTIATING", "CONVERTED", "LOST"]).optional(),
  notes: z.string().optional().nullable(),
  assignedTo: z.string().optional().nullable(),
});

// GET /api/admin/leads/[id] - Fetch single lead details with project & user searches
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        project: true,
        user: {
          include: {
            searches: {
              orderBy: { createdAt: "desc" }
            }
          }
        }
      }
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, lead });
  } catch (error: any) {
    console.error(`Error in GET /api/admin/leads/${id}:`, error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}

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
    const parse = leadUpdateSchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json({ error: "Invalid input data", details: parse.error.format() }, { status: 400 });
    }

    const data = parse.data;

    // Get current lead data to check for transitions
    const currentLead = await prisma.lead.findUnique({
      where: { id }
    });

    if (!currentLead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // Build update payload
    const updateData: any = {};
    if (data.status !== undefined) updateData.status = data.status;
    if (data.notes !== undefined) {
      // Append note with timestamp if notes already exist, or overwrite
      updateData.notes = data.notes;
    }
    if (data.assignedTo !== undefined) updateData.assignedTo = data.assignedTo;

    const updatedLead = await prisma.lead.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json({ success: true, lead: updatedLead });
  } catch (error: any) {
    console.error(`Error in PUT /api/admin/leads/${id}:`, error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
