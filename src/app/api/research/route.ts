import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getInvestmentRecommendations } from "@/lib/anthropic";

// In-memory rate limiting cache
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;
  const limit = 10;

  const record = rateLimitMap.get(ip);
  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + oneHour });
    return false;
  }

  if (record.count >= limit) {
    return true;
  }

  record.count++;
  return false;
}

// Input validation schema
const researchSchema = z.object({
  budget: z.number().min(10).max(500), // in Lakhs
  horizon: z.number().int().positive(),
  city: z.string().min(1),
  name: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  searchId: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || 
               req.headers.get("x-real-ip") || 
               "127.0.0.1";

    const body = await req.json();
    const parse = researchSchema.safeParse(body);
    
    if (!parse.success) {
      return NextResponse.json(
        { error: "Invalid inputs", details: parse.error.format() },
        { status: 400 }
      );
    }

    const { budget, horizon, city, name, email, phone, searchId } = parse.data;

    // Apply rate limiting (only for new report generation, not linking contact details)
    if (!searchId && isRateLimited(ip)) {
      return NextResponse.json(
        { error: "Rate limit exceeded. You can only generate 10 reports per hour." },
        { status: 429 }
      );
    }

    // Flow A: Link contact info to an existing search (user submitted details after report was shown)
    if (searchId && email) {
      const existingSearch = await prisma.search.findUnique({
        where: { id: searchId }
      });

      if (!existingSearch) {
        return NextResponse.json({ error: "Search record not found" }, { status: 404 });
      }

      // Find or create User
      const user = await prisma.user.upsert({
        where: { email },
        update: {
          name: name || undefined,
          phone: phone || undefined,
        },
        create: {
          email,
          name: name || "Anonymous Client",
          phone: phone || "",
          role: "CLIENT",
        }
      });

      // Update Search with user
      await prisma.search.update({
        where: { id: searchId },
        data: { userId: user.id }
      });

      // Create a Lead
      const lead = await prisma.lead.create({
        data: {
          userId: user.id,
          name: name || user.name || "Client",
          email,
          phone: phone || user.phone || "",
          budget: existingSearch.budget,
          horizon: existingSearch.horizon,
          city: existingSearch.city,
          notes: "Lead captured after generating AI investment report.",
          status: "NEW",
          source: "portal",
        }
      });

      // Initialize roadmap for the new lead
      try {
        const { initLeadRoadmap } = await import("@/lib/roadmap");
        await initLeadRoadmap(lead.id);
      } catch (roadmapErr) {
        console.error("Failed to initialize lead roadmap in Flow A:", roadmapErr);
      }

      // Simple mock notification check
      console.log(`[LEAD NOTIFICATION] New lead captured via saving report: ${lead.name} (${lead.email})`);

      return NextResponse.json({
        success: true,
        userId: user.id,
        leadId: lead.id,
      });
    }

    // Flow B: Initial report generation
    // Call AI recommendations helper
    const aiResponse = await getInvestmentRecommendations(budget, horizon, city);

    let userId: string | null = null;
    let leadId: string | null = null;

    // If contact info is submitted immediately along with the search form
    if (email) {
      const user = await prisma.user.upsert({
        where: { email },
        update: {
          name: name || undefined,
          phone: phone || undefined,
        },
        create: {
          email,
          name: name || "Anonymous Client",
          phone: phone || "",
          role: "CLIENT",
        }
      });
      userId = user.id;

      // Create Lead
      const lead = await prisma.lead.create({
        data: {
          userId: user.id,
          name: name || user.name || "Client",
          email,
          phone: phone || user.phone || "",
          budget,
          horizon,
          city,
          notes: "Lead captured at initial AI report generation.",
          status: "NEW",
          source: "portal",
        }
      });
      leadId = lead.id;

      // Initialize roadmap for the new lead
      try {
        const { initLeadRoadmap } = await import("@/lib/roadmap");
        await initLeadRoadmap(lead.id);
      } catch (roadmapErr) {
        console.error("Failed to initialize lead roadmap in Flow B:", roadmapErr);
      }
      
      console.log(`[LEAD NOTIFICATION] New lead captured at search: ${lead.name} (${lead.email})`);
    }

    // Save Search history
    const searchRecord = await prisma.search.create({
      data: {
        userId,
        budget,
        horizon,
        city,
        aiResponse: aiResponse as any, // Store JSON
      }
    });

    return NextResponse.json({
      success: true,
      searchId: searchRecord.id,
      recommendations: aiResponse,
      leadId,
    });
  } catch (error: any) {
    console.error("Error in research API route:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
