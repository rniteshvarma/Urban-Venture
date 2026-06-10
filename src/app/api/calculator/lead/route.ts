import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { calculateLeadScore } from "@/lib/lead-scorer";
import { classifyLeadPersona } from "@/lib/persona-engine";
import { runMatchingForLead } from "@/lib/matching-engine";
import { initLeadRoadmap } from "@/lib/roadmap";
import { fireWhatsAppTrigger } from "@/lib/whatsapp/trigger-handler";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, phone, budget, horizon, city, notes } = body;

    if (!email || !name || !phone) {
      return NextResponse.json({ error: "Name, email, and phone are required" }, { status: 400 });
    }

    // 1. Create or find User
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        name,
        phone
      },
      create: {
        email,
        name,
        phone,
        role: "CLIENT"
      }
    });

    // 2. Create Lead
    const lead = await prisma.lead.create({
      data: {
        userId: user.id,
        name,
        email,
        phone,
        budget: budget ? parseFloat(budget) : 50,
        horizon: horizon ? parseInt(horizon) : 10,
        city: city || "Hyderabad",
        notes: notes || "Lead captured from ROI Calculator.",
        status: "NEW",
        source: "portal"
      }
    });

    // 3. Run pipelines sequentially for consistency
    try {
      await initLeadRoadmap(lead.id);
    } catch (err) {
      console.error("Roadmap initialization failed:", err);
    }

    try {
      await classifyLeadPersona(lead.id);
    } catch (err) {
      console.error("Persona classification failed:", err);
    }

    try {
      await calculateLeadScore(lead.id);
    } catch (err) {
      console.error("Lead scoring failed:", err);
    }

    try {
      await runMatchingForLead(lead.id);
    } catch (err) {
      console.error("Project matching failed:", err);
    }

    try {
      await fireWhatsAppTrigger(lead.id, "LEAD_CREATED");
    } catch (err) {
      console.error("WhatsApp welcome trigger failed:", err);
    }

    return NextResponse.json({ success: true, leadId: lead.id });
  } catch (error: any) {
    console.error("Error in POST /api/calculator/lead:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
