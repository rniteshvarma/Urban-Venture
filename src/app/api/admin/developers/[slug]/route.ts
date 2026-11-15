// PATCH /api/admin/developers/[slug] — set or clear a builder's Google rating
// (copied by an admin from the builder's public Google profile).
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { parseGoogleRating } from "@/lib/developers/google";

export async function PATCH(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.res;
  const { slug } = await params;
  const parsed = parseGoogleRating(await req.json().catch(() => ({})));
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const v = parsed.value;
  const exists = await prisma.developer.count({ where: { slug } });
  if (!exists) return NextResponse.json({ error: "Builder not found." }, { status: 404 });
  const updated = await prisma.developer.update({
    where: { slug },
    data: v
      ? { googleRating: v.rating, googleReviewCount: v.reviews, googleProfileUrl: v.url, googleCheckedAt: new Date() }
      : { googleRating: null, googleReviewCount: null, googleProfileUrl: null, googleCheckedAt: null },
    select: { slug: true, googleRating: true, googleReviewCount: true, googleProfileUrl: true, googleCheckedAt: true },
  });
  return NextResponse.json({ ok: true, developer: updated });
}
