/**
 * GET /api/cron/osm-sync — daily. Re-imports OpenStreetMap categories older
 * than 30 days (oldest first, within a time budget — anything left over runs
 * the next day), then rescores listings that are new, edited or stale.
 * Protected with CRON_SECRET (assertCron fails closed in production).
 */
import { NextResponse, type NextRequest } from "next/server";
import { assertCron } from "@/lib/cron-auth";
import { runOsmJob } from "@/lib/osm/sync";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const denied = assertCron(req);
  if (denied) return denied;
  try {
    return NextResponse.json(await runOsmJob({ budgetMs: 200_000 }));
  } catch (error) {
    console.error("GET /api/cron/osm-sync", error);
    return NextResponse.json({ error: "OSM job failed" }, { status: 500 });
  }
}
