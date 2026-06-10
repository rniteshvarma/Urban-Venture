import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { BuyerPersona, LeadStatus } from "@prisma/client";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch all leads with their persona, budget, horizon, status, and searches
    const leads = await prisma.lead.findMany({
      include: {
        user: {
          include: {
            searches: true
          }
        }
      }
    });

    const configs = await prisma.personaConfig.findMany();

    // Group and calculate statistics for each of the 6 personas
    const stats = Object.values(BuyerPersona).map(persona => {
      const config = configs.find(c => c.persona === persona);
      const personaLeads = leads.filter(l => l.persona === persona);
      const total = personaLeads.length;

      // Budget & horizon averages
      const avgBudget = total > 0 
        ? Math.round(personaLeads.reduce((sum, l) => sum + l.budget, 0) / total)
        : 0;
      const avgHorizon = total > 0
        ? Math.round(personaLeads.reduce((sum, l) => sum + l.horizon, 0) / total)
        : 0;

      // Conversion Rate
      const convertedCount = personaLeads.filter(l => l.status === LeadStatus.CONVERTED).length;
      const conversionRate = total > 0 ? Math.round((convertedCount / total) * 100) : 0;

      // Find top corridor interest
      const corridorCounts: Record<string, number> = {};
      personaLeads.forEach(lead => {
        lead.user?.searches.forEach(search => {
          try {
            const aiRes = search.aiResponse as any;
            if (aiRes && Array.isArray(aiRes.corridors)) {
              aiRes.corridors.forEach((c: any) => {
                if (c && typeof c.name === "string") {
                  corridorCounts[c.name] = (corridorCounts[c.name] || 0) + 1;
                }
              });
            }
          } catch (e) {
            // Ignore parse errors
          }
        });
      });

      const topCorridors = Object.entries(corridorCounts)
        .sort((a, b) => b[1] - a[1])
        .map(e => e[0].replace("Corridor", "").trim());
      
      const topCorridor = topCorridors[0] || "None registered";

      return {
        persona,
        displayName: config?.displayName || persona.replace(/_/g, " "),
        description: config?.description || "",
        color: config?.color || "#64748B",
        icon: config?.icon || "👤",
        count: total,
        avgBudget,
        avgHorizon,
        conversionRate,
        topCorridor
      };
    });

    return NextResponse.json({ success: true, stats });
  } catch (error: any) {
    console.error("Error in GET /api/admin/personas/stats:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
