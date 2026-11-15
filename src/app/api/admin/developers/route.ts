// GET /api/admin/developers?q= — builders with their Google rating fields, for the admin editor.
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.res;
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  const rows = await prisma.developer.findMany({
    where: q ? { name: { contains: q, mode: "insensitive" } } : {},
    select: { slug: true, name: true, googleRating: true, googleReviewCount: true, googleProfileUrl: true, googleCheckedAt: true, stats: true },
    orderBy: { name: "asc" },
    take: 100,
  });
  return NextResponse.json({
    developers: rows.map(({ stats, ...d }) => ({ ...d, projects: (stats as { stats?: { projects?: number } } | null)?.stats?.projects ?? 0 })),
  });
}
