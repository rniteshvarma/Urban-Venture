// GET /api/listings/villages?q= — village typeahead for the post flow.
// Returns [] until the geo (LGD/boundary) dataset is loaded; the flow degrades
// gracefully to corridor selection in the meantime.
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";

export async function GET(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = (new URL(req.url).searchParams.get("q") ?? "").trim();
  if (q.length < 2) return NextResponse.json({ villages: [] });

  const rows = await prisma.revenueVillage.findMany({
    where: { name: { contains: q, mode: "insensitive" } },
    take: 12,
    select: {
      id: true, name: true, centroidLat: true, centroidLng: true,
      mandal: { select: { name: true, district: { select: { name: true } } } },
    },
  });

  return NextResponse.json({
    villages: rows.map((v) => ({
      id: v.id,
      name: v.name,
      mandal: v.mandal?.name ?? null,
      district: v.mandal?.district?.name ?? null,
      centroidLat: v.centroidLat,
      centroidLng: v.centroidLng,
    })),
  });
}
