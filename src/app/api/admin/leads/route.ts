import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

const leadCreateSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
  budget: z.number().positive(),
  horizon: z.number().int().positive(),
  city: z.string().min(1),
  notes: z.string().optional().nullable(),
  status: z.enum(["NEW", "CONTACTED", "INTERESTED", "NEGOTIATING", "CONVERTED", "LOST"]).optional(),
});

// GET /api/admin/leads - List all leads with filters & pagination
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const city = searchParams.get("city");
    const persona = searchParams.get("persona");
    
    const skip = (page - 1) * limit;

    const where: any = {};

    if (status && status !== "ALL") {
      where.status = status;
    }

    if (city) {
      where.city = city;
    }

    if (persona && persona !== "ALL") {
      where.persona = persona;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
    }

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          project: true,
          user: {
            include: {
              searches: true
            }
          }
        }
      }),
      prisma.lead.count({ where })
    ]);

    return NextResponse.json({
      leads,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    console.error("Error in GET /api/admin/leads:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}

// POST /api/admin/leads - Create lead manually
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parse = leadCreateSchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json({ error: "Invalid input data", details: parse.error.format() }, { status: 400 });
    }

    const data = parse.data;

    // Find or create user associated with email
    const user = await prisma.user.upsert({
      where: { email: data.email },
      update: {
        name: data.name,
        phone: data.phone,
      },
      create: {
        email: data.email,
        name: data.name,
        phone: data.phone,
        role: "CLIENT",
      }
    });

    // Create the lead manually
    const lead = await prisma.lead.create({
      data: {
        userId: user.id,
        name: data.name,
        email: data.email,
        phone: data.phone,
        budget: data.budget,
        horizon: data.horizon,
        city: data.city,
        notes: data.notes || "Added manually by admin.",
        status: data.status || "NEW",
        source: "manual",
      }
    });

    // Initialize roadmap for the new lead
    try {
      const { initLeadRoadmap } = await import("@/lib/roadmap");
      await initLeadRoadmap(lead.id);
    } catch (roadmapErr) {
      console.error("Failed to initialize lead roadmap:", roadmapErr);
    }

    // Trigger Persona, Score, and Matches calculations for the new lead
    try {
      const { classifyLeadPersona } = await import("@/lib/persona-engine");
      const { calculateLeadScore } = await import("@/lib/lead-scorer");
      const { runMatchingForLead } = await import("@/lib/matching-engine");

      await classifyLeadPersona(lead.id);
      await calculateLeadScore(lead.id);
      await runMatchingForLead(lead.id);
      console.log(`Successfully classified, scored, and matched new manually created lead: ${lead.id}`);
    } catch (engineErr) {
      console.error("Failed to execute intelligence engines for manually created lead:", engineErr);
    }

    return NextResponse.json({ success: true, lead });
  } catch (error: any) {
    console.error("Error in POST /api/admin/leads:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
