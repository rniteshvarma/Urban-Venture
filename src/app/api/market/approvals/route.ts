import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ApprovalAuth, ApprovalType } from "@prisma/client";

// GET /api/market/approvals - Public approvals search database
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");
    const corridor = searchParams.get("corridor");
    const authority = searchParams.get("authority");
    const approvalType = searchParams.get("type");

    const where: any = {
      isPublished: true
    };

    if (corridor && corridor !== "ALL") {
      where.corridor = corridor;
    }

    if (authority && authority !== "ALL") {
      where.authority = authority as ApprovalAuth;
    }

    if (approvalType && approvalType !== "ALL") {
      where.approvalType = approvalType as ApprovalType;
    }

    if (search) {
      where.OR = [
        { projectName: { contains: search, mode: "insensitive" } },
        { developerName: { contains: search, mode: "insensitive" } },
        { approvalNumber: { contains: search, mode: "insensitive" } },
      ];
    }

    const approvals = await prisma.approvalRecord.findMany({
      where,
      orderBy: {
        approvalDate: "desc"
      }
    });

    return NextResponse.json(approvals);
  } catch (error: any) {
    console.error("Error in GET /api/market/approvals:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
