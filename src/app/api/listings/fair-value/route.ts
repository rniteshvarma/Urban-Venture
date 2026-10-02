// GET /api/listings/fair-value?villageId=&corridor=&propertyType= — model price range, in the listing's area unit, for the
// live pricing panel in the post flow. Reuses existing CorridorProfile prices.
import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/session";
import { fairValueForListing } from "@/lib/listings/fair-value";

export async function GET(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const villageId = searchParams.get("villageId");
  const corridor = searchParams.get("corridor");
  const propertyType = searchParams.get("propertyType");

  const fv = await fairValueForListing({ villageId, corridor, propertyType });
  return NextResponse.json(fv);
}
