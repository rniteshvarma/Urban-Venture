import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

const demandUpdateSchema = z.object({
  newListings: z.number().int().nonnegative().optional().nullable(),
  inventoryUnits: z.number().int().nonnegative().optional().nullable(),
  soldUnits: z.number().int().nonnegative().optional().nullable(),
  medianDaysOnMkt: z.number().int().nonnegative().optional().nullable(),
});

// PUT /api/admin/demand/[corridor]/[year]/[month] - Update/Upsert demand trend data
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ corridor: string; year: string; month: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { corridor, year: yearStr, month: monthStr } = await params;
    const decodedCorridor = decodeURIComponent(corridor);
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);

    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      return NextResponse.json({ error: "Invalid year or month parameters" }, { status: 400 });
    }

    const body = await req.json();
    const parse = demandUpdateSchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json({ error: "Invalid input data", details: parse.error.format() }, { status: 400 });
    }

    const { newListings, inventoryUnits, soldUnits, medianDaysOnMkt } = parse.data;

    // Resolve Corridor Profile slug
    const profile = await prisma.corridorProfile.findFirst({
      where: {
        OR: [
          { slug: { equals: decodedCorridor, mode: "insensitive" } },
          { name: { equals: decodedCorridor, mode: "insensitive" } },
          { shortName: { equals: decodedCorridor, mode: "insensitive" } }
        ]
      }
    });

    const targetCorridor = profile ? profile.slug : decodedCorridor.toLowerCase().replace(/\s+/g, "-");

    // 1. Calculate absorption rate
    let absorptionRate: number | null = null;
    if (inventoryUnits && soldUnits && inventoryUnits > 0) {
      absorptionRate = parseFloat(((soldUnits / inventoryUnits) * 100).toFixed(2));
    }

    // 2. Query portal internal data for searchVolume, inquiryCount, siteVisits
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    // Auto-populate searchVolume (count searches where recommended corridors contains this corridor)
    const searches = await prisma.search.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lt: endDate
        }
      }
    });
    const searchVolume = searches.filter(s => {
      const jsonStr = JSON.stringify(s.aiResponse);
      return jsonStr.toLowerCase().includes(targetCorridor.toLowerCase());
    }).length;

    // Auto-populate inquiryCount (leads created in this month matching a project in this corridor)
    const inquiryCount = await prisma.lead.count({
      where: {
        createdAt: {
          gte: startDate,
          lt: endDate
        },
        project: {
          corridor: { equals: targetCorridor, mode: "insensitive" }
        }
      }
    });

    // Auto-populate siteVisits (completed site visits in this month for leads of this corridor)
    const siteVisits = await prisma.roadmapStage.count({
      where: {
        stageKey: "SITE_VISIT",
        status: "COMPLETED",
        completedAt: {
          gte: startDate,
          lt: endDate
        },
        roadmap: {
          lead: {
            project: {
              corridor: { equals: targetCorridor, mode: "insensitive" }
            }
          }
        }
      }
    });

    // 3. Upsert into database
    const existing = await prisma.demandTrend.findFirst({
      where: {
        corridor: { equals: targetCorridor, mode: "insensitive" },
        month,
        year
      }
    });

    let result;
    if (existing) {
      result = await prisma.demandTrend.update({
        where: { id: existing.id },
        data: {
          corridor: targetCorridor,
          corridorProfileSlug: profile ? profile.slug : null,
          newListings: newListings !== undefined ? newListings : existing.newListings,
          inventoryUnits: inventoryUnits !== undefined ? inventoryUnits : existing.inventoryUnits,
          soldUnits: soldUnits !== undefined ? soldUnits : existing.soldUnits,
          medianDaysOnMkt: medianDaysOnMkt !== undefined ? medianDaysOnMkt : existing.medianDaysOnMkt,
          absorptionRate,
          searchVolume: searchVolume || existing.searchVolume,
          inquiryCount: inquiryCount || existing.inquiryCount,
          siteVisits: siteVisits || existing.siteVisits,
        }
      });
    } else {
      result = await prisma.demandTrend.create({
        data: {
          corridor: targetCorridor,
          corridorProfileSlug: profile ? profile.slug : null,
          month,
          year,
          newListings: newListings || 0,
          inventoryUnits: inventoryUnits || 0,
          soldUnits: soldUnits || 0,
          medianDaysOnMkt: medianDaysOnMkt || 0,
          absorptionRate: absorptionRate || 0,
          searchVolume: searchVolume || 0,
          inquiryCount: inquiryCount || 0,
          siteVisits: siteVisits || 0
        }
      });
    }

    return NextResponse.json({ success: true, demand: result });
  } catch (error: any) {
    console.error("Error in PUT /api/admin/demand/[corridor]/[year]/[month]:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
