// GET /api/cron/listings-weekly — weekly score snapshots + locality benchmarks
// that power the seller performance trend chart. Protected with CRON_SECRET.
import { NextResponse, type NextRequest } from "next/server";
import { writeScoreSnapshots } from "@/lib/listings/maintenance";
import { assertCron } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(req: NextRequest) {
  const denied = assertCron(req);
  if (denied) return denied;
  try {
    const result = await writeScoreSnapshots();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("cron listings-weekly", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
