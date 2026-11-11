// POST /api/projects/[id]/enquiry — a buyer enquires on a listing.
// Creates a ListingEnquiry AND a Lead in the existing CRM, firing the existing
// automations unchanged (Constraint 8). Buyer contact stays hidden from the
// seller until an admin releases it.
import { NextResponse, after } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";
import { formContact } from "@/lib/leads/contact";
import { intakeLead, isValidMobile } from "@/lib/leads/intake";
import { followUpLead } from "@/lib/leads/follow-up";
import { clientIp, hit, tooMany } from "@/lib/security/rate-limit";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? "").trim();
  const phone = String(body.phone ?? "").trim();
  const email = body.email ? String(body.email).trim() : null;
  const message = body.message ? String(body.message).trim() : null;
  // Budget is in lakh. A value above 1,00,000 "lakh" (₹10,000 Cr) can only be a
  // rupee amount typed into the lakh field — convert it rather than store nonsense.
  const rawBudget = body.budgetLakh != null && body.budgetLakh !== "" ? Number(body.budgetLakh) : null;
  const budgetLakh = rawBudget == null || !Number.isFinite(rawBudget) || rawBudget <= 0 ? null : rawBudget > 100000 ? Math.round(rawBudget / 100000) : rawBudget;

  if (!name || !phone) return NextResponse.json({ error: "Name and phone are required." }, { status: 400 });
  if (!isValidMobile(phone)) return NextResponse.json({ error: "Enter a valid 10-digit mobile number." }, { status: 400 });
  const [byIp, byPhone] = await Promise.all([hit("enquiryIp", clientIp(req.headers)), hit("enquiryPhone", phone.replace(/\D/g, "").slice(-10))]);
  if (!byIp.ok || !byPhone.ok) return tooMany(byIp.ok ? byPhone : byIp, "Too many enquiries. Please try again later, or call us.");

  const project = await prisma.project.findFirst({
    where: { id, listingStatus: "APPROVED" },
    select: { id: true, name: true, city: true, ownerId: true },
  });
  if (!project) return NextResponse.json({ error: "Listing not available." }, { status: 404 });

  const sessionUserId = await getSessionUserId();

  // 1. Lead in the existing CRM (upsert the buyer by email when we have one)
  let leadUserId: string | null = sessionUserId;
  if (!leadUserId && email) {
    // Links to the contact's account without ever changing it.
    leadUserId = (await formContact({ email, name, phone, sessionUserId: null })).userId;
  }
  // One open lead per person: a repeat enquiry is added to the lead they already have.
  // A budget they didn't give stays empty — it is never filled in for them.
  const intake = await intakeLead({
    name,
    phone,
    email,
    budgetLakh,
    city: project.city || "Hyderabad",
    projectId: project.id,
    userId: leadUserId,
    source: "listing_enquiry",
    note: `Enquiry on listing "${project.name}"${message ? `: ${message}` : ""}`,
  });
  const lead = { id: intake.leadId };

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

  // 4. Tell the team and run the CRM automations once the buyer has their answer.
  after(() => followUpLead(intake, `Enquiry on "${project.name}"${message ? `: ${message}` : ""}`));

  return NextResponse.json({ ok: true, enquiryId: enquiry.id });
}
