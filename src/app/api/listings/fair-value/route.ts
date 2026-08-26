// GET /api/listings/fair-value?villageId=&corridor= — model price range for the
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

  const fv = await fairValueForListing({ villageId, corridor });
  return NextResponse.json(fv);
}
