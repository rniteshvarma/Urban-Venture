// POST /api/admin/whatsapp/health — run a provider health check now.
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { checkTierUsage, runHealthCheck } from "@/lib/whatsapp/health";

export const dynamic = "force-dynamic";

export async function POST() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.res;
  const health = await runHealthCheck();
  const tier = await checkTierUsage(true);
  return NextResponse.json({ ...health, tier });
}
