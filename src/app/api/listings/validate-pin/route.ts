// POST /api/listings/validate-pin  { villageId, latitude, longitude }
// → { pinInsideVillage: boolean | null, verified }
// null means the village has no boundary data on file — the check did not run
// and must not be reported as a pass or a fail.
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";
import { pointInsideBoundary } from "@/lib/listings/geo-check";

export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { villageId, latitude, longitude } = await req.json().catch(() => ({}));
  if (!villageId || typeof latitude !== "number" || typeof longitude !== "number") {
    return NextResponse.json({ error: "villageId, latitude and longitude are required." }, { status: 400 });
  }

  const village = await prisma.revenueVillage.findUnique({
    where: { id: villageId },
    select: { boundaryGeoJSON: true, centroidLat: true, centroidLng: true, name: true },
  });
  if (!village) return NextResponse.json({ error: "Village not found" }, { status: 404 });

  const inside = pointInsideBoundary(latitude, longitude, village.boundaryGeoJSON);
  return NextResponse.json({
    pinInsideVillage: inside,
    verified: inside !== null,
    village: { name: village.name, centroidLat: village.centroidLat, centroidLng: village.centroidLng },
  });
}
