import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { buildResearchReport } from "@/lib/research/report";
import { formContact } from "@/lib/leads/contact";
import { getSessionUserId } from "@/lib/session";
import { clientIp, hit, tooMany } from "@/lib/security/rate-limit";

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
    if (!searchId) {
      const limited = await hit("researchIp", clientIp(req.headers));
      if (!limited.ok) return tooMany(limited, "Rate limit exceeded. You can only generate 10 reports per hour.");
    }

    // Flow A: Link contact info to an existing search (user submitted details after report was shown)
    if (searchId && email) {
      const existingSearch = await prisma.search.findUnique({
        where: { id: searchId }
      });

      if (!existingSearch) {
        return NextResponse.json({ error: "Search record not found" }, { status: 404 });
      }

      // A report already saved to an account stays with it.
      const sessionUserId = await getSessionUserId();
      if (existingSearch.userId && existingSearch.userId !== sessionUserId) {
        return NextResponse.json({ error: "This report is already saved to an account." }, { status: 409 });
      }
      // Never changes an existing account; only its owner gets the report attached.
      const contact = await formContact({ email, name, phone, sessionUserId });
      const user = { id: contact.userId, name: null as string | null, phone: null as string | null };
      if (contact.owned) {
        await prisma.search.update({ where: { id: searchId }, data: { userId: contact.userId } });
      }

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
          notes: "Lead captured after generating a research report.",
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

      return NextResponse.json({ success: true, leadId: lead.id });
    }

    // Flow B: Initial report generation
    // Corridors that fit the brief, from measured data (src/lib/research)
    const aiResponse = await buildResearchReport(budget, horizon, city);

    let userId: string | null = null;
    let leadId: string | null = null;

    // If contact info is submitted immediately along with the search form
    if (email) {
      const contact = await formContact({ email, name, phone, sessionUserId: await getSessionUserId() });
      const user = { id: contact.userId, name: null as string | null, phone: null as string | null };
      // The report is attached only to its owner's account.
      userId = contact.owned ? user.id : null;

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
