import { NextResponse, after } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { buildResearchReport } from "@/lib/research/report";
import { formContact } from "@/lib/leads/contact";
import { getSessionUserId } from "@/lib/session";
import { clientIp, hit, tooMany } from "@/lib/security/rate-limit";
import { intakeLead, isValidMobile } from "@/lib/leads/intake";
import { followUpLead } from "@/lib/leads/follow-up";

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
    if (phone && !isValidMobile(phone)) {
      return NextResponse.json({ error: "Enter a valid 10-digit mobile number." }, { status: 400 });
    }

    // Apply rate limiting (only for new report generation, not linking contact details)
    if (!searchId) {
      const limited = await hit("researchIp", clientIp(req.headers));
      if (!limited.ok) return tooMany(limited, "Rate limit exceeded. You can only generate 10 reports per hour.");
    }

    // Flow A: Link contact info to an existing search (user submitted details after report was shown)
    if (searchId && (email || phone)) {
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
      // A phone-only request has no account — the lead alone carries it.
      const contact = email ? await formContact({ email, name, phone, sessionUserId }) : sessionUserId ? { userId: sessionUserId, owned: true } : null;
      if (contact?.owned) {
        await prisma.search.update({ where: { id: searchId }, data: { userId: contact.userId } });
      }

      // The budget and holding period are the ones the visitor entered for this report.
      const what = "Asked to be contacted after running a research report.";
      const intake = await intakeLead({
        name: name || "Client",
        phone,
        email,
        budgetLakh: existingSearch.budget,
        horizonYears: existingSearch.horizon,
        city: existingSearch.city,
        userId: contact?.userId ?? null,
        source: "research",
        note: what,
      });
      after(() => followUpLead(intake, what));

      return NextResponse.json({ success: true, leadId: intake.leadId });
    }

    // Flow B: Initial report generation
    // Corridors that fit the brief, from measured data (src/lib/research)
    const aiResponse = await buildResearchReport(budget, horizon, city);

    let userId: string | null = null;
    let leadId: string | null = null;

    // If contact info is submitted immediately along with the search form
    if (email || phone) {
      const sessionUserId = await getSessionUserId();
      const contact = email ? await formContact({ email, name, phone, sessionUserId }) : sessionUserId ? { userId: sessionUserId, owned: true } : null;
      // The report is attached only to its owner's account.
      userId = contact?.owned ? contact.userId : null;

      const what = "Left contact details when running a research report.";
      const intake = await intakeLead({ name: name || "Client", phone, email, budgetLakh: budget, horizonYears: horizon, city, userId: contact?.userId ?? null, source: "research", note: what });
      after(() => followUpLead(intake, what));
      leadId = intake.leadId;
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
