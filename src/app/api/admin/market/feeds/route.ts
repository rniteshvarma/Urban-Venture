/**
 * POST /api/admin/market/feeds — run the market data feeds now (whatever is
 * due; ?force=1 refetches everything), then recompute the corridors.
 * Same time budget as the cron; anything left over runs next time.
 */
import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { runMarketFeeds } from "@/lib/market/feeds/run";
import { computeAllCorridorScores } from "@/lib/corridor-intelligence";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.res;
  try {
    const summary = await runMarketFeeds({ budgetMs: 200_000, force: req.nextUrl.searchParams.get("force") === "1" });
    await computeAllCorridorScores();
    return NextResponse.json(summary);
  } catch (error) {
    console.error("POST /api/admin/market/feeds", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Feeds failed" }, { status: 500 });
  }
}
