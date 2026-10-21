/**
 * GET /api/cron/developer-records — daily. Reads due TG-RERA certificates and
 * new TG-RERA orders (each within a time budget; the rest runs next day),
 * then rebuilds the developer track records. Runs in bom1: Telangana
 * government sites time out from abroad. Protected with CRON_SECRET.
 */
import { NextResponse, type NextRequest } from "next/server";
import { assertCron } from "@/lib/cron-auth";
import { withJobRun } from "@/lib/ops/record";
import { rebuildDevelopers, syncCertificates, syncOrders } from "@/lib/developers/sync";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

async function handler(req: NextRequest) {
  const denied = assertCron(req);
  if (denied) return denied;
  try {
    const certificates = await syncCertificates({ budgetMs: 90_000 });
    const orders = await syncOrders({ budgetMs: 120_000 });
    const developers = await rebuildDevelopers();
    return NextResponse.json({ certificates, orders: { ...orders, errors: orders.errors.slice(0, 10) }, developers });
  } catch (error) {
    console.error("GET /api/cron/developer-records", error);
    return NextResponse.json({ error: "Developer records job failed" }, { status: 500 });
  }
}

export const GET = withJobRun("developer-records", handler);
