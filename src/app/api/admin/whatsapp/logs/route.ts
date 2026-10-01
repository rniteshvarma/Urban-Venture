import { NextResponse } from "next/server";
import type { Prisma, WAStatus } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

// GET /api/admin/whatsapp/logs — filter by lead, provider, category, status,
// normalised error, feature and free text; paginated.
export async function GET(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.res;

  try {
    const sp = new URL(req.url).searchParams;
    const limit = Math.min(Math.max(parseInt(sp.get("limit") ?? "100") || 100, 1), 500);
    const page = Math.max(parseInt(sp.get("page") ?? "1") || 1, 1);

    const where: Prisma.WhatsAppLogWhereInput = {};
    if (sp.get("leadId")) where.leadId = sp.get("leadId")!;
    if (sp.get("provider")) where.provider = sp.get("provider")!;
    if (sp.get("category")) where.category = sp.get("category")!;
    if (sp.get("status")) where.status = sp.get("status") as WAStatus;
    if (sp.get("feature")) where.feature = sp.get("feature")!;
    const error = sp.get("error");
    if (error === "any") where.normalisedError = { not: null };
    else if (error) where.normalisedError = error;
    if (sp.get("dryRun") === "true") where.dryRun = true;
    if (sp.get("dryRun") === "false") where.dryRun = false;
    const q = sp.get("q")?.trim();
    if (q) {
      where.OR = [
        { toPhone: { contains: q.replace(/[^\d+]/g, "") || q } },
        { templateName: { contains: q, mode: "insensitive" } },
        { message: { contains: q, mode: "insensitive" } },
        { lead: { name: { contains: q, mode: "insensitive" } } },
      ];
    }

    const [logs, total] = await Promise.all([
      prisma.whatsAppLog.findMany({
        where,
        include: { lead: { select: { id: true, name: true, phone: true } }, template: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: (page - 1) * limit,
      }),
      prisma.whatsAppLog.count({ where }),
    ]);

    return NextResponse.json({ success: true, logs, total, page, limit });
  } catch (error) {
    console.error("Error in GET /api/admin/whatsapp/logs:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
