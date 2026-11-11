// POST /api/projects/[id]/site-visit — a buyer asks to visit a project.
// Creates a SiteVisit for our team to confirm, and a Lead (source
// "site_visit") so the CRM roadmap, scoring and automations run as for any
// enquiry. The seller or developer is not contacted until our team confirms.
import { NextResponse, after } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";
import { SLOTS, validateVisitRequest } from "@/lib/buyer/site-visit";
import { intakeLead } from "@/lib/leads/intake";
import { followUpLead } from "@/lib/leads/follow-up";
import { clientIp, hit, tooMany } from "@/lib/security/rate-limit";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const v = validateVisitRequest(body, new Date());
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });
  const [byIp, byPhone] = await Promise.all([hit("enquiryIp", clientIp(req.headers)), hit("enquiryPhone", v.value.phone.replace(/\D/g, "").slice(-10))]);
  if (!byIp.ok || !byPhone.ok) return tooMany(byIp.ok ? byPhone : byIp, "Too many requests. Please try again later, or call us.");

  const project = await prisma.project.findFirst({
    where: { id, listingStatus: "APPROVED", status: "ACTIVE" },
    select: { id: true, name: true, city: true },
  });
  if (!project) return NextResponse.json({ error: "Listing not available." }, { status: 404 });

  const userId = await getSessionUserId();
  const { name, phone, email, date, slot, note } = v.value;
  const what = `Site visit requested for "${project.name}" on ${date.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" })} (${SLOTS[slot]})${note ? `: ${note}` : ""}`;
  // Added to the buyer's open lead when they have one; no budget or holding period is assumed.
  const intake = await intakeLead({ name, phone, email, city: project.city || "Hyderabad", projectId: project.id, userId, source: "site_visit", note: what });
  const lead = { id: intake.leadId };
  const visit = await prisma.siteVisit.create({
    data: { projectId: project.id, leadId: lead.id, userId, name, phone, email, preferredDate: date, slot, note },
  });

  after(() => followUpLead(intake, what));
  return NextResponse.json({ ok: true, visitId: visit.id });
}
