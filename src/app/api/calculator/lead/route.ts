// POST /api/calculator/lead — a call-back request from the ROI calculator.
import { NextResponse, after } from "next/server";
import { formContact } from "@/lib/leads/contact";
import { getSessionUserId } from "@/lib/session";
import { intakeLead, isValidMobile } from "@/lib/leads/intake";
import { followUpLead } from "@/lib/leads/follow-up";
import { clientIp, hit, tooMany } from "@/lib/security/rate-limit";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const name = String(body.name ?? "").trim();
    const phone = String(body.phone ?? "").trim();
    const email = body.email ? String(body.email).trim() : null;

    if (!name || !phone) return NextResponse.json({ error: "Name and phone are required." }, { status: 400 });
    if (!isValidMobile(phone)) return NextResponse.json({ error: "Enter a valid 10-digit mobile number." }, { status: 400 });
    const [byIp, byPhone] = await Promise.all([hit("enquiryIp", clientIp(req.headers)), hit("enquiryPhone", phone.replace(/\D/g, "").slice(-10))]);
    if (!byIp.ok || !byPhone.ok) return tooMany(byIp.ok ? byPhone : byIp, "Too many requests. Please try again later.");

    // The contact's account — an existing one is linked but never changed. No email, no account.
    const sessionUserId = await getSessionUserId();
    const userId = sessionUserId ?? (email ? (await formContact({ email, name, phone, sessionUserId: null })).userId : null);

    // The amount and years are what the visitor set on the calculator's sliders.
    const budget = Number(body.budget);
    const horizon = Number(body.horizon);
    const what = String(body.notes ?? "").trim() || "Call-back request from the ROI calculator.";
    const intake = await intakeLead({
      name,
      phone,
      email,
      budgetLakh: Number.isFinite(budget) && budget > 0 ? budget : null,
      horizonYears: Number.isFinite(horizon) && horizon > 0 ? Math.round(horizon) : null,
      city: body.city ? String(body.city) : "Hyderabad",
      userId,
      source: "calculator",
      note: what,
    });
    after(() => followUpLead(intake, what));

    return NextResponse.json({ success: true, leadId: intake.leadId });
  } catch (error) {
    console.error("Error in POST /api/calculator/lead:", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
