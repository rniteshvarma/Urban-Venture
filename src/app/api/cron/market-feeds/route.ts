/**
 * GET /api/cron/market-feeds — daily. Refreshes whatever is due (official
 * guidance values monthly, the MagicBricks cross-check quarterly, news
 * figures for review every day), within a time budget, then recomputes the
 * corridors. Protected with CRON_SECRET (assertCron fails closed in production).
 */
import { NextResponse, type NextRequest } from "next/server";
import { assertCron } from "@/lib/cron-auth";
import { runMarketFeeds } from "@/lib/market/feeds/run";
import { computeAllCorridorScores } from "@/lib/corridor-intelligence";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const denied = assertCron(req);
  if (denied) return denied;
  try {
    const summary = await runMarketFeeds({ budgetMs: 200_000 });
    await computeAllCorridorScores();
    return NextResponse.json(summary);
  } catch (error) {
    console.error("GET /api/cron/market-feeds", error);
    return NextResponse.json({ error: "Market feeds failed" }, { status: 500 });
  }
}
