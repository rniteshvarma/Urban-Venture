import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/market/corridors/[slug]/approvals - Fetch approval records for a corridor
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const decodedSlug = decodeURIComponent(slug);

    const metric = await prisma.corridorMetrics.findFirst({
      where: {
        corridor: { equals: decodedSlug, mode: "insensitive" }
      }
    });

    if (!metric) {
      return NextResponse.json({ error: "Corridor not found" }, { status: 404 });
    }

    const approvals = await prisma.approvalRecord.findMany({
      where: {
        corridor: { equals: metric.corridor, mode: "insensitive" },
        isPublished: true
      },
      orderBy: {
        approvalDate: "desc"
      }
    });

    // Compute stats
    const totalHmda = approvals.filter(a => a.authority === "HMDA").length;
    const totalRera = approvals.filter(a => a.authority === "RERA_TELANGANA" || a.reraNumber).length;
    const pendingCount = approvals.filter(a => a.status === "PENDING").length;

    return NextResponse.json({
      corridor: metric.corridor,
      approvals,
      totalHmda,
      totalRera,
      pendingCount
    });
  } catch (error: any) {
    console.error("Error in GET /api/market/corridors/[slug]/approvals:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
