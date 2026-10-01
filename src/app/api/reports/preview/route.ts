// POST /api/reports/preview — render the signed-in user's NEXT report without
// sending or persisting anything (so a preview never pollutes the dedup ledger).
import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/session";
import { previewReport } from "@/lib/reports/persist";

export async function POST() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  const start = new Date(now.getTime() - 7 * 86_400_000);
  const { assembled, headline } = await previewReport(userId, start, now, now);

  return NextResponse.json({
    content: { ...assembled.content, _headline: headline },
    headline: headline.headline,
    topThree: assembled.topThree,
    itemCount: assembled.itemCount,
    fallbackLevel: assembled.fallbackLevel,
    period: { start, end: now },
  });
}
