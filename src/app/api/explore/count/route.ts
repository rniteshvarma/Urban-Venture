// GET /api/explore/count — live "Showing N properties" for the filters panel.
// Count-only and deliberately cheap; the panel debounces this at 300ms while
// the user drags sliders, before they press Apply.
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { parseBbox, parseFilters, buildWhere } from "@/lib/explore/query";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const sp = new URL(req.url).searchParams;
    // bbox is optional: when present the count matches what the user would see
    // in the current viewport, which is what the panel claims.
    const bbox = parseBbox(sp.get("bbox"));
    const count = await prisma.project.count({ where: buildWhere(bbox, parseFilters(sp)) });
    return NextResponse.json({ count });
  } catch (error) {
    console.error("GET /api/explore/count", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
