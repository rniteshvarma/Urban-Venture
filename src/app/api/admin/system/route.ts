/** GET /api/admin/system — job health and recent server errors (admin only). */
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { jobStatuses, recentErrors } from "@/lib/ops/status";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.res;
  const [jobs, errors] = await Promise.all([jobStatuses(), recentErrors(72, 200)]);
  return NextResponse.json({ jobs, errors });
}
