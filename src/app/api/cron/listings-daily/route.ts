// GET /api/cron/listings-daily — daily seller-listing maintenance:
// rescore approved listings, expire stale ones, and emit expiry / draft /
// enquiry-SLA nudges. Protected with CRON_SECRET (existing cron auth pattern).
import { NextResponse, type NextRequest } from "next/server";
import { rescoreApprovedListings, expireStaleListings, nudgeExpiryAndDrafts, enquirySlaSweep } from "@/lib/listings/maintenance";
import { assertCron } from "@/lib/cron-auth";
import { scoreAllListings } from "@/lib/score/compute";
import { withJobRun } from "@/lib/ops/record";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

async function handler(req: NextRequest) {
  const denied = assertCron(req);
  if (denied) return denied;
  try {
    const expired = await expireStaleListings();
    const rescored = await rescoreApprovedListings();
    const nudges = await nudgeExpiryAndDrafts();
    const sla = await enquirySlaSweep();
    // Property Tiger Score for every public listing (picks up new map data, prices and builder records).
    const tiger = await scoreAllListings();
    return NextResponse.json({ ok: true, ...expired, ...rescored, ...nudges, ...sla, tiger });
  } catch (error) {
    console.error("cron listings-daily", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export const GET = withJobRun("listings-daily", handler);
