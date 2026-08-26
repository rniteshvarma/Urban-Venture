// POST /api/listings/check-survey  { villageId, surveyNumbers[], excludeId? }
// Duplicate detection: same village + overlapping survey number against other
// approved listings. Surfaces matches; never auto-rejects.
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";

export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { villageId, surveyNumbers, excludeId } = await req.json().catch(() => ({}));
  if (!villageId || !Array.isArray(surveyNumbers) || surveyNumbers.length === 0) {
    return NextResponse.json({ duplicates: [] });
  }
  const nums = surveyNumbers.map((s: unknown) => String(s).trim()).filter(Boolean);

  const candidates = await prisma.project.findMany({
    where: {
      villageId,
      listingStatus: "APPROVED",
      surveyNumbers: { hasSome: nums },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true, name: true, corridor: true, surveyNumbers: true, listingSource: true },
  });

  return NextResponse.json({
    duplicates: candidates.map((c) => ({
      id: c.id,
      name: c.name,
      corridor: c.corridor,
      overlap: c.surveyNumbers.filter((s) => nums.includes(s)),
      source: c.listingSource,
    })),
  });
}
