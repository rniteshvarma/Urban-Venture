import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Distinct corridors/zones that currently have live projects, with counts —
// drives the Projects page filter so it always matches the real inventory.
export async function GET() {
  try {
    const rows = await prisma.project.groupBy({
      by: ["corridor"],
      where: { status: "ACTIVE", NOT: { listingSource: "SELLER", listingScore: { lt: 40 } } },
      _count: { _all: true },
    });
    const corridors = rows
      .map((r) => ({ name: r.corridor, count: r._count._all }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
    return NextResponse.json(corridors);
  } catch (error) {
    console.error("Error fetching corridors:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
