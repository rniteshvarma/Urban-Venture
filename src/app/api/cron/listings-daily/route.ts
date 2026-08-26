// GET /api/cron/listings-daily — daily seller-listing maintenance:
// rescore approved listings, expire stale ones, and emit expiry / draft /
// enquiry-SLA nudges. Protected with CRON_SECRET (existing cron auth pattern).
import { NextResponse, type NextRequest } from "next/server";
import { rescoreApprovedListings, expireStaleListings, nudgeExpiryAndDrafts, enquirySlaSweep } from "@/lib/listings/maintenance";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const expired = await expireStaleListings();
    const rescored = await rescoreApprovedListings();
    const nudges = await nudgeExpiryAndDrafts();
    const sla = await enquirySlaSweep();
    return NextResponse.json({ ok: true, ...expired, ...rescored, ...nudges, ...sla });
  } catch (error) {
    console.error("cron listings-daily", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
