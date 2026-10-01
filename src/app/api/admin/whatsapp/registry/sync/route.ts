// POST /api/admin/whatsapp/registry/sync — pull templates from the WABA now.
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { syncTemplates } from "@/lib/whatsapp/registry";

export const dynamic = "force-dynamic";

export async function POST() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.res;
  const result = await syncTemplates();
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
