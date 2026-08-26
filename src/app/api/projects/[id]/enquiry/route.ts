// POST /api/projects/[id]/enquiry — a buyer enquires on a listing.
// Creates a ListingEnquiry AND a Lead in the existing CRM, firing the existing
// automations unchanged (Constraint 8). Buyer contact stays hidden from the
// seller until an admin releases it.
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";
import { classifyLeadPersona } from "@/lib/persona-engine";
import { calculateLeadScore } from "@/lib/lead-scorer";
import { runMatchingForLead } from "@/lib/matching-engine";
import { initLeadRoadmap } from "@/lib/roadmap";
import { fireWhatsAppTrigger } from "@/lib/whatsapp/trigger-handler";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? "").trim();
  const phone = String(body.phone ?? "").trim();
  const email = body.email ? String(body.email).trim() : null;
  const message = body.message ? String(body.message).trim() : null;
  const budgetLakh = body.budgetLakh != null && body.budgetLakh !== "" ? Number(body.budgetLakh) : null;

  if (!name || !phone) return NextResponse.json({ error: "Name and phone are required." }, { status: 400 });

  const project = await prisma.project.findFirst({
    where: { id, listingStatus: "APPROVED" },
    select: { id: true, name: true, city: true, corridor: true, ownerId: true, minHorizonYears: true },
  });
  if (!project) return NextResponse.json({ error: "Listing not available." }, { status: 404 });

  const sessionUserId = await getSessionUserId();

  // 1. Lead in the existing CRM (upsert the buyer by email when we have one)
  let leadUserId: string | null = sessionUserId;
  if (!leadUserId && email) {
    const u = await prisma.user.upsert({ where: { email }, update: { name, phone }, create: { email, name, phone, role: "CLIENT" } });
    leadUserId = u.id;
  }
  const lead = await prisma.lead.create({
    data: {
      userId: leadUserId ?? undefined,
      projectId: project.id,
      name,
      email: email ?? `${phone.replace(/\D/g, "")}@no-email.local`,
      phone,
      budget: budgetLakh ?? 50,
      horizon: project.minHorizonYears ?? 5,
      city: project.city || "Hyderabad",
      notes: `Enquiry on listing "${project.name}"${message ? `: ${message}` : ""}`,
      status: "NEW",
      source: "listing_enquiry",
    },
  });

  // 2. ListingEnquiry (contact hidden from seller until admin release)
  const enquiry = await prisma.listingEnquiry.create({
    data: {
      projectId: project.id,
      buyerUserId: leadUserId,
      buyerName: name,
      buyerPhone: phone,
      buyerEmail: email,
      message,
      budgetLakh,
      leadId: lead.id,
      status: "NEW",
    },
  });

  // 3. Counters
  await prisma.project.update({ where: { id: project.id }, data: { enquiryCount: { increment: 1 } } });
  if (project.ownerId) {
    await prisma.sellerProfile.updateMany({ where: { userId: project.ownerId }, data: { totalEnquiries: { increment: 1 } } });
  }

  // 4. Existing CRM automations (best-effort, non-blocking)
  for (const [label, fn] of [
    ["roadmap", () => initLeadRoadmap(lead.id)],
    ["persona", () => classifyLeadPersona(lead.id)],
    ["score", () => calculateLeadScore(lead.id)],
    ["matching", () => runMatchingForLead(lead.id)],
    ["whatsapp", () => fireWhatsAppTrigger(lead.id, "LEAD_CREATED")],
  ] as const) {
    try {
      await fn();
    } catch (err) {
      console.error(`Enquiry automation ${label} failed:`, err);
    }
  }

  return NextResponse.json({ ok: true, enquiryId: enquiry.id });
}
