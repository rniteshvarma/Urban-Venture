// GET /api/seller/listings/[id]/score — live breakdown + improvement list.
import { NextResponse } from "next/server";
import { requireSeller, ownedListing } from "@/lib/listings/api";
import { scorePreview } from "@/lib/listings/score-io";
import { gradeFor } from "@/lib/listings/score";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireSeller();
  if (!auth.ok) return auth.res;
  const { id } = await ctx.params;

  const listing = await ownedListing(auth.userId, id);
  if (!listing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const result = await scorePreview(id);
  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const potential = result.breakdown.total + result.improvements.reduce((s, i) => s + i.points, 0);
  return NextResponse.json({
    breakdown: result.breakdown,
    improvements: result.improvements,
    grade: gradeFor(result.breakdown.total),
    potential: Math.min(100, potential),
  });
}
