// Shared guard for scheduled (cron) routes.
//
// Previously each route did:
//   if (process.env.CRON_SECRET && header !== `Bearer ${CRON_SECRET}`) reject
// which fails OPEN — with CRON_SECRET unset the check is skipped entirely and
// anyone can trigger the job. This helper fails CLOSED instead.
import { NextResponse } from "next/server";

/**
 * Returns null when the request is an authorized cron invocation, or a response
 * to return when it is not.
 *
 * In production a missing CRON_SECRET disables the endpoint (503) rather than
 * opening it. In development, requests are allowed so jobs stay testable.
 */
export function assertCron(req: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      console.error("[cron] CRON_SECRET is not set — refusing to run scheduled job.");
      return NextResponse.json({ error: "Cron not configured" }, { status: 503 });
    }
    return null; // dev convenience only
  }

  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
