// GET  /api/reports/preferences — the signed-in user's report preferences
// PUT  /api/reports/preferences — create/update them (contextual or full form)
//
// Phone verification comes from the User row (set at signup) — never re-asked.
// First completion stamps completedAt, which makes the user eligible for runs.
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";

const PROPERTY_TYPES = new Set(["PLOT", "FARM_PLOT", "AGRICULTURAL_LAND", "APARTMENT", "VILLA", "INDEPENDENT_HOUSE", "COMMERCIAL", "INDUSTRIAL_LAND"]);
const FREQUENCIES = new Set(["WEEKLY", "FORTNIGHTLY", "MONTHLY", "PAUSED"]);
const MAX_AREAS = 5;

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [pref, user] = await Promise.all([
    prisma.reportPreference.findUnique({ where: { userId } }),
    prisma.user.findUnique({ where: { id: userId }, select: { name: true, phone: true, phoneVerified: true, email: true, budget: true, horizon: true, preferredCity: true } }),
  ]);

  // Detect the browser timezone client-side; surface a sensible default here.
  return NextResponse.json({
    preference: pref,
    user: { name: user?.name ?? null, phone: user?.phone ?? null, phoneVerified: user?.phoneVerified ?? false, email: user?.email ?? null },
    // pre-fill hints for a brand-new preference, drawn from the user's profile
    prefill: pref ? null : { budgetMaxLakh: user?.budget ?? null, horizonYears: user?.horizon ?? null, city: user?.preferredCity ?? "Hyderabad" },
  });
}

export async function PUT(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));

  // Partial-friendly: only fields present in the body are written, so contextual
  // capture points can save one field without clobbering the rest.
  const data: Record<string, unknown> = {};
  const num = (v: unknown) => (v == null || v === "" ? null : Number.isFinite(Number(v)) ? Number(v) : undefined);

  if ("budgetMinLakh" in body) data.budgetMinLakh = num(body.budgetMinLakh);
  if ("budgetMaxLakh" in body) data.budgetMaxLakh = num(body.budgetMaxLakh);
  if ("horizonYears" in body) data.horizonYears = num(body.horizonYears);
  if ("city" in body && typeof body.city === "string") data.city = body.city;

  if ("areaSlugs" in body) {
    if (!Array.isArray(body.areaSlugs)) return NextResponse.json({ error: "areaSlugs must be an array" }, { status: 400 });
    const slugs: string[] = [...new Set((body.areaSlugs as unknown[]).map((s) => String(s)))].slice(0, MAX_AREAS);
    // Validate against real published corridors
    const valid = await prisma.corridorProfile.findMany({ where: { slug: { in: slugs }, isPublished: true }, select: { slug: true } });
    data.areaSlugs = valid.map((v) => v.slug);
  }
  if ("propertyTypes" in body) {
    if (!Array.isArray(body.propertyTypes)) return NextResponse.json({ error: "propertyTypes must be an array" }, { status: 400 });
    data.propertyTypes = body.propertyTypes.map(String).filter((t: string) => PROPERTY_TYPES.has(t));
  }

  if ("channelWhatsApp" in body) data.channelWhatsApp = !!body.channelWhatsApp;
  if ("channelEmail" in body) data.channelEmail = !!body.channelEmail;
  if ("frequency" in body && FREQUENCIES.has(String(body.frequency))) {
    data.frequency = String(body.frequency);
    // Choosing an active frequency is an explicit re-subscribe.
    if (data.frequency !== "PAUSED") {
      data.isActive = true;
      data.unsubscribedAt = null;
      data.pausedUntil = null;
    }
  }
  if ("timezone" in body && typeof body.timezone === "string") data.timezone = body.timezone;
  if ("preferredDay" in body) { const d = num(body.preferredDay); if (d != null && d >= 0 && d <= 6) data.preferredDay = d; }
  if ("preferredHour" in body) { const h = num(body.preferredHour); if (h != null && h >= 0 && h <= 23) data.preferredHour = h; }

  // Undefined means "provided but invalid" — reject rather than silently drop.
  for (const [k, v] of Object.entries(data)) if (v === undefined) return NextResponse.json({ error: `Invalid value for ${k}` }, { status: 400 });

  // Mirror phone verification from the User (source of truth).
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { phoneVerified: true } });
  data.phoneVerified = user?.phoneVerified ?? false;

  const existing = await prisma.reportPreference.findUnique({ where: { userId }, select: { id: true, completedAt: true } });
  // A preference is "complete" once it has at least a budget and one area.
  const merged = { ...existing, ...data } as { budgetMaxLakh?: number | null; areaSlugs?: string[] };
  const nowComplete = (merged.budgetMaxLakh != null || (data.budgetMaxLakh ?? null) != null) && ((data.areaSlugs as string[] | undefined)?.length ?? 0) > 0;

  const pref = await prisma.reportPreference.upsert({
    where: { userId },
    create: { userId, ...data, ...(nowComplete ? { completedAt: new Date() } : {}) },
    update: { ...data, ...(!existing?.completedAt && nowComplete ? { completedAt: new Date() } : {}) },
  });

  return NextResponse.json({ preference: pref });
}
