/**
 * GET  /api/admin/osm/sync — OpenStreetMap import status for the admin card.
 * POST /api/admin/osm/sync — run the job now (categories due for a refresh;
 *      ?force=1 re-imports every category). Same time budget as the cron.
 */
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { OSM_CATEGORIES, OSM_CATEGORY_KEYS } from "@/lib/osm/categories";
import { runOsmJob } from "@/lib/osm/sync";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.res;
  const [groups, lastRun, scored, withPins] = await Promise.all([
    prisma.osmFeature.groupBy({ by: ["category"], _count: { _all: true }, _max: { syncedAt: true } }),
    prisma.osmSyncRun.findFirst({ orderBy: { startedAt: "desc" } }),
    prisma.projectAccessibility.count(),
    prisma.project.count({ where: { latitude: { not: null }, longitude: { not: null } } }),
  ]);
  const byCat = new Map(groups.map((g) => [g.category, g]));
  return NextResponse.json({
    categories: OSM_CATEGORY_KEYS.map((c) => ({
      key: c,
      label: OSM_CATEGORIES[c].label,
      count: byCat.get(c)?._count._all ?? 0,
      syncedAt: byCat.get(c)?._max.syncedAt ?? null,
    })),
    lastRun,
    scored,
    withPins,
  });
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.res;
  const force = new URL(req.url).searchParams.get("force") === "1";
  try {
    return NextResponse.json(await runOsmJob({ forceSync: force, budgetMs: 200_000 }));
  } catch (error) {
    console.error("POST /api/admin/osm/sync", error);
    return NextResponse.json({ error: "OSM job failed" }, { status: 500 });
  }
}
