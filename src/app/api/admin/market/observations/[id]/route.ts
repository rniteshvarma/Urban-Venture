/**
 * PATCH /api/admin/market/observations/[id] — review a figure read from news.
 * Body: { status: "APPROVED" | "REJECTED" | "PENDING", metric?, value?, period? }
 * Approving recomputes the corridors, so a newer city figure (e.g. price
 * growth) moves the forecast anchors straight away.
 */
import { NextResponse, type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { CITY_METRIC_LABEL, type CityMetric } from "@/lib/market/feeds/news";
import { computeAllCorridorScores } from "@/lib/corridor-intelligence";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const STATUSES = new Set(["APPROVED", "REJECTED", "PENDING"]);

/** Plausible ranges for a Hyderabad city figure (any period from a month to a year). */
const PLAUSIBLE: Record<CityMetric, [number, number]> = {
  city_registrations: [500, 150_000],
  city_registrations_value_cr: [100, 150_000],
  city_avg_price_sqft: [3_000, 25_000],
  city_price_growth_yoy: [-25, 35],
  city_sales_units: [500, 150_000],
  city_launch_units: [500, 150_000],
};

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.res;
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { status?: string; metric?: string; value?: number; period?: string };
  if (!body.status || !STATUSES.has(body.status)) return NextResponse.json({ error: "status must be APPROVED, REJECTED or PENDING" }, { status: 400 });
  const row = await prisma.marketObservation.findUnique({ where: { id } });
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (row.source !== "NEWS") return NextResponse.json({ error: "Only figures read from news are reviewed" }, { status: 400 });
  if (body.metric && !(body.metric in CITY_METRIC_LABEL)) return NextResponse.json({ error: "Unknown metric" }, { status: 400 });
  const metric = (body.metric ?? row.metric) as CityMetric;
  const value = body.value ?? row.value;
  if (!Number.isFinite(value)) return NextResponse.json({ error: "value must be a number" }, { status: 400 });
  // Approving moves the city stats and, for price growth, the forecast — so out-of-range numbers
  // (a typo, a lakh/crore mix-up, a quarterly figure entered as yearly) are refused.
  if (body.status === "APPROVED") {
    const [lo, hi] = PLAUSIBLE[metric];
    if (value < lo || value > hi) {
      return NextResponse.json({ error: `${CITY_METRIC_LABEL[metric].label} of ${value} is outside the plausible range ${lo} – ${hi} for Hyderabad. Check the article.` }, { status: 400 });
    }
  }
  const updated = await prisma.marketObservation.update({
    where: { id },
    data: {
      status: body.status,
      metric,
      unit: CITY_METRIC_LABEL[metric].unit,
      value,
      ...(body.period?.trim() ? { period: body.period.trim() } : {}),
      reviewedAt: new Date(),
      reviewedBy: auth.userId,
    },
  });
  if (body.status === "APPROVED" || row.status === "APPROVED") await computeAllCorridorScores({ skipAI: true });
  return NextResponse.json({ row: updated });
}
