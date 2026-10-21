// POST /api/projects/[id]/site-visit — a buyer asks to visit a project.
// Creates a SiteVisit for our team to confirm, and a Lead (source
// "site_visit") so the CRM roadmap, scoring and automations run as for any
// enquiry. The seller or developer is not contacted until our team confirms.
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";
import { classifyLeadPersona } from "@/lib/persona-engine";
import { calculateLeadScore } from "@/lib/lead-scorer";
import { initLeadRoadmap } from "@/lib/roadmap";
import { fireWhatsAppTrigger } from "@/lib/whatsapp/trigger-handler";
import { validateVisitRequest } from "@/lib/buyer/site-visit";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const v = validateVisitRequest(body, new Date());
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });

  const project = await prisma.project.findFirst({
    where: { id, listingStatus: "APPROVED", status: "ACTIVE" },
    select: { id: true, name: true, city: true, minHorizonYears: true },
  });
  if (!project) return NextResponse.json({ error: "Listing not available." }, { status: 404 });

  const userId = await getSessionUserId();
  const { name, phone, email, date, slot, note } = v.value;
  const lead = await prisma.lead.create({
    data: {
      userId: userId ?? undefined,
      projectId: project.id,
      name,
      email: email ?? `${phone.replace(/\D/g, "")}@no-email.local`,
      phone,
      budget: 50,
      horizon: project.minHorizonYears ?? 5,
      city: project.city || "Hyderabad",
      notes: `Site visit requested for "${project.name}" on ${date.toISOString().slice(0, 10)} (${slot.toLowerCase()})${note ? `: ${note}` : ""}`,
      status: "NEW",
      source: "site_visit",
    },
  });
  const visit = await prisma.siteVisit.create({
    data: { projectId: project.id, leadId: lead.id, userId, name, phone, email, preferredDate: date, slot, note },
  });

  for (const [label, fn] of [
    ["roadmap", () => initLeadRoadmap(lead.id)],
    ["persona", () => classifyLeadPersona(lead.id)],
    ["score", () => calculateLeadScore(lead.id)],
    ["whatsapp", () => fireWhatsAppTrigger(lead.id, "LEAD_CREATED")],
  ] as const) {
    try {
      await fn();
    } catch (err) {
      console.error(`Site visit automation ${label} failed:`, err);
    }
  }
  return NextResponse.json({ ok: true, visitId: visit.id });
}
