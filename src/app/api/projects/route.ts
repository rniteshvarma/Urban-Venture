import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { filtersFromParams, projectOrder, projectWhere } from "@/lib/projects/query";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { gradeFor } from "@/lib/listings/score";
import { gradeOf } from "@/lib/inventory/rating";
import { freshnessOf } from "@/lib/inventory/freshness";
import { PRICE_BADGE_DAYS, priceBadge } from "@/lib/projects/price-change";

// Card-sized projection: the feed can hold thousands of projects, so the heavy
// columns (unit tables, media, provenance) stay on the detail endpoint.
const cardSelect = (since: Date) =>
  ({
    id: true, name: true, developer: true, corridor: true, city: true,
    minBudgetLakhs: true, maxBudgetLakhs: true, minHorizonYears: true, maxHorizonYears: true,
    riskLevel: true, propertyType: true, infraHighlights: true, imageUrls: true, status: true,
    createdAt: true, possessionText: true, reraNumber: true, latitude: true, longitude: true,
    listingSource: true, sourceType: true, listingScore: true, specifications: true,
    sourceCheckedAt: true, sourceState: true, sourceGoneSince: true,
    priceChanges: { where: { changedAt: { gte: since } }, orderBy: { changedAt: "desc" }, take: 1, select: { fromMinLakh: true, toMinLakh: true, changedAt: true } },
  }) satisfies Prisma.ProjectSelect;

type CardRow = Prisma.ProjectGetPayload<{ select: ReturnType<typeof cardSelect> }>;

/** Constraint 7: never expose the raw seller score publicly — a grade (A/B/C)
 *  communicates the same thing. Researched admin inventory carries Property
 *  Tiger's own rating, which is public by design. */
function toCard({ listingScore, specifications, sourceType, imageUrls, priceChanges, sourceCheckedAt, sourceState, sourceGoneSince, ...p }: CardRow, now: Date) {
  const isInventory = p.listingSource === "ADMIN" && sourceType === "CSV_IMPORT" && listingScore != null;
  const spec = (specifications ?? {}) as { locality?: string; listingKind?: string; sources?: { name?: string; url?: string; accessed?: string }[] };
  const listingKind = spec.listingKind ?? "PROJECT";
  const fresh = sourceType === "CSV_IMPORT" ? freshnessOf({ listingKind, sources: spec.sources, sourceCheckedAt, sourceState, sourceGoneSince }, now) : null;
  return {
    ...p,
    imageUrls: imageUrls.slice(0, 1),
    locality: spec.locality ?? null,
    listingKind,
    isVerifiedInventory: p.listingSource === "ADMIN",
    listingGrade: p.listingSource === "SELLER" && listingScore != null ? gradeFor(listingScore) : null,
    inventoryScore: isInventory ? listingScore : null,
    inventoryGrade: isInventory ? gradeOf(listingScore!) : null,
    freshness: fresh ? { state: fresh.state, label: fresh.label, checkedOn: fresh.checkedOn } : null,
    priceBadge: priceBadge(priceChanges[0], now),
  };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const now = new Date();
    const since = new Date(now.getTime() - PRICE_BADGE_DAYS * 86_400_000);

    const filters = filtersFromParams(searchParams);
    // Non-default statuses are an admin view; checking the session only then keeps the public feed cheap.
    const admin = filters.status && filters.status !== "ACTIVE" ? (await getServerSession(authOptions))?.user?.role === "ADMIN" : false;
    const where = projectWhere(filters, { admin });
    const orderBy = projectOrder(searchParams.get("sort"));
    const headers = admin ? undefined : { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=600" };

    // Paged mode (the /projects page): { items, total, page, pageSize }.
    if (searchParams.has("page")) {
      const pageSize = Math.min(Math.max(Number(searchParams.get("pageSize")) || 24, 1), 60);
      const page = Math.max(Math.floor(Number(searchParams.get("page")) || 1), 1);
      const [rows, total] = await Promise.all([
        prisma.project.findMany({ where, select: cardSelect(since), orderBy, skip: (page - 1) * pageSize, take: pageSize }),
        prisma.project.count({ where }),
      ]);
      return NextResponse.json({ items: rows.map((r) => toCard(r, now)), total, page, pageSize, hasMore: page * pageSize < total }, { headers });
    }

    // Plain list (homepage strip, research report): capped.
    const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 0, 0), 200) || 200;
    const rows = await prisma.project.findMany({ where, select: cardSelect(since), orderBy, take: limit });
    return NextResponse.json(rows.map((r) => toCard(r, now)), { headers });
  } catch (error) {
    console.error("Error fetching projects:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
