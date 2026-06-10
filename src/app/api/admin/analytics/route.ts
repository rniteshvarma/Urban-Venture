import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Leads by status
    const statusCounts = await prisma.lead.groupBy({
      by: ["status"],
      _count: {
        id: true,
      },
    });

    const statusMap = {
      NEW: 0,
      CONTACTED: 0,
      INTERESTED: 0,
      NEGOTIATING: 0,
      CONVERTED: 0,
      LOST: 0,
    };
    statusCounts.forEach((item) => {
      if (item.status in statusMap) {
        statusMap[item.status as keyof typeof statusMap] = item._count.id;
      }
    });

    const leadsByStatus = Object.entries(statusMap).map(([name, value]) => ({
      name,
      value,
    }));

    // 2. Leads by budget range
    // Buckets: <25L, 25-50L, 50L-1Cr, 1-2Cr, 2Cr+
    const leads = await prisma.lead.findMany({
      select: { budget: true, city: true, horizon: true, createdAt: true, status: true },
    });

    const budgetBuckets = {
      "<25L": 0,
      "25-50L": 0,
      "50L-1Cr": 0,
      "1-2Cr": 0,
      "2Cr+": 0,
    };

    leads.forEach((l) => {
      const b = l.budget;
      if (b < 25) budgetBuckets["<25L"]++;
      else if (b <= 50) budgetBuckets["25-50L"]++;
      else if (b <= 100) budgetBuckets["50L-1Cr"]++;
      else if (b <= 200) budgetBuckets["1-2Cr"]++;
      else budgetBuckets["2Cr+"]++;
    });

    const budgetDistribution = Object.entries(budgetBuckets).map(([name, value]) => ({
      name,
      value,
    }));

    // 3. Leads by city
    const cityCounts: { [key: string]: number } = {};
    leads.forEach((l) => {
      const city = l.city || "Unknown";
      cityCounts[city] = (cityCounts[city] || 0) + 1;
    });

    const leadsByCity = Object.entries(cityCounts).map(([name, value]) => ({
      name,
      value,
    }));

    // 4. Horizon distribution
    const horizonCounts: { [key: string]: number } = {};
    leads.forEach((l) => {
      const hStr = `${l.horizon}Y`;
      horizonCounts[hStr] = (horizonCounts[hStr] || 0) + 1;
    });
    const horizonDistribution = Object.entries(horizonCounts).map(([name, value]) => ({
      name,
      value,
    }));

    // 5. Corridor popularity / Heatmap (aggregate from Searches)
    const searches = await prisma.search.findMany({
      select: { aiResponse: true },
    });

    const corridorCounts: { [key: string]: number } = {};
    searches.forEach((s) => {
      try {
        const responseJson = s.aiResponse as any;
        if (responseJson && Array.isArray(responseJson.corridors)) {
          responseJson.corridors.forEach((c: any) => {
            if (c && typeof c.name === "string") {
              corridorCounts[c.name] = (corridorCounts[c.name] || 0) + 1;
            }
          });
        }
      } catch (e) {
        // Ignore parsing errors
      }
    });

    const corridorPopularity = Object.entries(corridorCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    // 6. Weekly lead volume (last 12 weeks)
    const weeklyVolume: { [key: string]: number } = {};
    const now = new Date();
    // Initialize last 12 weeks
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
      const year = d.getFullYear();
      const week = getWeekNumber(d);
      weeklyVolume[`W${week} ${year}`] = 0;
    }

    leads.forEach((l) => {
      const d = new Date(l.createdAt);
      const year = d.getFullYear();
      const week = getWeekNumber(d);
      const key = `W${week} ${year}`;
      if (key in weeklyVolume) {
        weeklyVolume[key]++;
      }
    });

    const weeklyLeadVolume = Object.entries(weeklyVolume).map(([name, value]) => ({
      name,
      value,
    }));

    // 7. Conversion Funnel
    // Total Searches -> Total Leads -> Contacted -> Converted
    const totalSearches = await prisma.search.count();
    const totalLeads = leads.length;
    const contactedLeads = leads.filter((l) => l.status !== "NEW").length;
    const convertedLeads = leads.filter((l) => l.status === "CONVERTED").length;

    const conversionFunnel = [
      { name: "Searches", value: totalSearches },
      { name: "Leads", value: totalLeads },
      { name: "Contacted", value: contactedLeads },
      { name: "Converted", value: convertedLeads },
    ];

    // Helpers function to compute week number
    function getWeekNumber(d: Date) {
      const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
      const dayNum = date.getUTCDay() || 7;
      date.setUTCDate(date.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
      return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    }

    // 8. Hot Leads Today (Top 5 Grade-A Leads)
    const hotLeads = await prisma.lead.findMany({
      where: {
        leadScoreGrade: "A",
      },
      orderBy: {
        leadScore: "desc",
      },
      take: 5,
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        leadScore: true,
        leadScoreGrade: true,
        status: true,
        persona: true,
      },
    });

    // 9. Persona Distribution
    const personaCounts = await prisma.lead.groupBy({
      by: ["persona"],
      _count: {
        id: true,
      },
    });
    const personaDistribution = personaCounts.map((item) => ({
      name: item.persona ? item.persona.replace(/_/g, " ") : "Not Segmented",
      value: item._count.id,
    }));

    // 10. Score Grade Distribution
    const gradeCounts = await prisma.lead.groupBy({
      by: ["leadScoreGrade"],
      _count: {
        id: true,
      },
    });
    
    const gradeMap: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 };
    gradeCounts.forEach((item) => {
      if (item.leadScoreGrade) {
        gradeMap[item.leadScoreGrade] = item._count.id;
      } else {
        gradeMap.D += item._count.id;
      }
    });
    
    const scoreGradeDistribution = Object.entries(gradeMap).map(([name, value]) => ({
      name: `Grade ${name}`,
      value,
    }));

    return NextResponse.json({
      leadsByStatus,
      budgetDistribution,
      leadsByCity,
      horizonDistribution,
      corridorPopularity,
      weeklyLeadVolume,
      conversionFunnel,
      hotLeads,
      personaDistribution,
      scoreGradeDistribution,
      kpis: {
        totalLeads,
        newLeads7Days: leads.filter(
          (l) => new Date(l.createdAt).getTime() > now.getTime() - 7 * 24 * 60 * 60 * 1000
        ).length,
        activeProjects: await prisma.project.count({ where: { status: "ACTIVE" } }),
        conversionRate: totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(1) : "0",
      },
    });
  } catch (error: any) {
    console.error("Error in GET /api/admin/analytics:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
