// GET /api/cron/whatsapp-maintenance — daily: sweep webhook events left
// unprocessed, sync the template registry, run a provider health check
// (quality alerts) and check messaging-tier usage.
import { NextResponse, type NextRequest } from "next/server";
import { assertCron } from "@/lib/cron-auth";
import { processPending } from "@/lib/whatsapp/webhook";
import { syncTemplates } from "@/lib/whatsapp/registry";
import { checkTierUsage, runHealthCheck } from "@/lib/whatsapp/health";
import { sweepConcierge } from "@/lib/concierge/sweep";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(req: NextRequest) {
  const denied = assertCron(req);
  if (denied) return denied;
  try {
    const events = await processPending(undefined, 500);
    const templates = await syncTemplates();
    const health = await runHealthCheck();
    const tier = await checkTierUsage(true);
    const concierge = await sweepConcierge();
    return NextResponse.json({
      ok: true,
      eventsProcessed: events.processed,
      templates: { ok: templates.ok, synced: templates.synced, error: templates.error },
      health: { ok: health.ok, provider: health.provider, detail: health.detail },
      tier,
      concierge,
    });
  } catch (error) {
    console.error("cron whatsapp-maintenance", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
