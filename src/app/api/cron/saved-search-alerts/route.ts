/**
 * GET /api/cron/saved-search-alerts — daily. Emails buyers new listings that
 * match their saved searches and price changes on their saved projects.
 * Protected with CRON_SECRET.
 */
import { NextResponse } from "next/server";
import { withJobRun } from "@/lib/ops/record";
import { runBuyerAlerts } from "@/lib/buyer/alerts";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

async function handler() {
  return NextResponse.json(await runBuyerAlerts());
}

export const GET = withJobRun("saved-search-alerts", handler);
