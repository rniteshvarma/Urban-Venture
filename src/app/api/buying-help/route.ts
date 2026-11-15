// POST /api/buying-help — a buyer asks for help with one or more steps of buying.
// Goes through the shared lead intake (one lead per phone) and alerts the team.
import { NextResponse, after } from "next/server";
import { getSessionUserId } from "@/lib/session";
import { formContact } from "@/lib/leads/contact";
import { intakeLead, isValidMobile } from "@/lib/leads/intake";
import { followUpLead } from "@/lib/leads/follow-up";
import { JOURNEY } from "@/lib/buyer/journey";
import { clientIp, hit, tooMany } from "@/lib/security/rate-limit";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? "").trim().slice(0, 120);
  const phone = String(body.phone ?? "").trim();
  const email = body.email ? String(body.email).trim().slice(0, 200) : null;
  const message = body.message ? String(body.message).trim().slice(0, 1000) : null;
  const steps = JOURNEY.filter((s) => Array.isArray(body.steps) && body.steps.includes(s.id));
  const budget = Number(body.budgetLakh);

  if (!name || !phone) return NextResponse.json({ error: "Name and mobile number are required." }, { status: 400 });
  if (!isValidMobile(phone)) return NextResponse.json({ error: "Enter a valid 10-digit mobile number." }, { status: 400 });
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "That email address doesn't look right." }, { status: 400 });
  const [byIp, byPhone] = await Promise.all([hit("enquiryIp", clientIp(req.headers)), hit("enquiryPhone", phone.replace(/\D/g, "").slice(-10))]);
  if (!byIp.ok || !byPhone.ok) return tooMany(byIp.ok ? byPhone : byIp, "Too many requests. Please try again later.");

  const sessionUserId = await getSessionUserId();
  const userId = sessionUserId ?? (email ? (await formContact({ email, name, phone, sessionUserId: null })).userId : null);
  const what = `Buying help request${steps.length ? `: ${steps.map((s) => s.title).join(", ")}` : ""}${message ? ` — "${message}"` : ""}`;
  const intake = await intakeLead({
    name, phone, email, userId,
    budgetLakh: Number.isFinite(budget) && budget > 0 ? budget : null,
    source: "buying_help",
    note: what,
  });
  after(() => followUpLead(intake, what));
  return NextResponse.json({ ok: true });
}
