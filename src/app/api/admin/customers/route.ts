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

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");

    const where: any = { role: "CLIENT" };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
    }

    const customers = await prisma.user.findMany({
      where,
      include: {
        leads: {
          orderBy: { createdAt: "desc" }
        },
        searches: {
          orderBy: { createdAt: "desc" }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    // Format output to match CRM fields
    const formattedCustomers = customers.map((c) => {
      const lastLead = c.leads[0];
      const lastSearch = c.searches[0];
      
      const lastActivityDate = [
        c.createdAt,
        lastLead?.updatedAt,
        lastSearch?.createdAt
      ]
        .filter(Boolean)
        .sort((a, b) => b.getTime() - a.getTime())[0];

      return {
        id: c.id,
        name: c.name || "Anonymous",
        email: c.email,
        phone: c.phone || "N/A",
        searchesCount: c.searches.length,
        leadStatus: lastLead?.status || "NO_LEAD",
        lastActivity: lastActivityDate || c.createdAt,
        leads: c.leads,
        searches: c.searches,
      };
    });

    return NextResponse.json(formattedCustomers);
  } catch (error: any) {
    console.error("Error in GET /api/admin/customers:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
