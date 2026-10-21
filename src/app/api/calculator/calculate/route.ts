import { NextResponse } from "next/server";
import { runRoiCalculations } from "@/lib/calculator";
import prisma from "@/lib/prisma";
import { ANCHOR_RATES } from "@/lib/market/forecast";
import { CITY } from "@/lib/market/anchors";

/** Lakh amount → "₹45.5 Lakh" or "₹1.74 Cr" (matches how prices are shown across the site). */
function inr(lakhs: number): string {
  return lakhs >= 100 ? `₹${(lakhs / 100).toFixed(2)} Cr` : `₹${Number(lakhs.toFixed(1))} Lakh`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { 
      initialAmount, 
      years = 10, 
      corridorId, 
      customCagrMin, 
      customCagrMax, 
      customRentMin,
      customRentMax
    } = body;

    if (!initialAmount || isNaN(initialAmount) || initialAmount <= 0) {
      return NextResponse.json({ error: "Invalid initial investment amount" }, { status: 400 });
    }

    let corridorName = "General Hyderabad Corridor";
    // Defaults are the published city anchors (src/lib/market/anchors.ts), not a hoped-for return.
    let cagrMin = customCagrMin !== undefined ? parseFloat(customCagrMin) : ANCHOR_RATES.conservative;
    let cagrMax = customCagrMax !== undefined ? parseFloat(customCagrMax) : ANCHOR_RATES.optimistic;
    let rentMin = customRentMin !== undefined ? parseFloat(customRentMin) : CITY.rentalYield.value;
    let rentMax = customRentMax !== undefined ? parseFloat(customRentMax) : CITY.rentalYield.value;

    let infrastructureTailwinds: any[] = [];

    if (corridorId && corridorId !== "CUSTOM") {
      const corridorMetrics = await prisma.corridorProfile.findUnique({
        where: { id: corridorId }
      });
      if (corridorMetrics) {
        corridorName = corridorMetrics.name;
        // The corridor's scenario range (conservative → optimistic, 10-year CAGR).
        cagrMin = corridorMetrics.projectedCAGRMin ?? cagrMin;
        cagrMax = corridorMetrics.projectedCAGRMax ?? cagrMax;
        // Plots earn no rent; built property uses the city's published yield.
        const primary = (corridorMetrics.marketStats as { primaryAsset?: string } | null)?.primaryAsset;
        if (customRentMin === undefined && customRentMax === undefined) {
          if (primary === "plot") { rentMin = 0; rentMax = 0; }
          // Measured gross yield on flats here (middle half of rents), when we have enough rental listings.
          else if (corridorMetrics.rentalYieldMin != null && corridorMetrics.rentalYieldMax != null) {
            rentMin = corridorMetrics.rentalYieldMin;
            rentMax = corridorMetrics.rentalYieldMax;
          }
        }

        // Query upcoming infra projects to boost CAGR and list tailwinds
        try {
          const upcomingInfra = await prisma.infraProject.findMany({
            where: {
              OR: [
                { affectedCorridorSlugs: { has: corridorMetrics.slug } },
                { affectedCorridors: { has: corridorMetrics.name } }
              ],
              isPublished: true,
              NOT: {
                status: {
                  in: ["COMPLETE", "CANCELLED"]
                }
              }
            },
            orderBy: { status: "desc" }
          });

          // Listed for context only — the corridor's growth range already
          // includes its infrastructure premium, so it isn't added again.
          infrastructureTailwinds = upcomingInfra.slice(0, 2).map(p => ({
            name: p.name,
            status: p.status,
            estimatedCompletion: p.estimatedCompletion
          }));
        } catch (dbErr) {
          console.error("Failed to query upcoming infra for calculator", dbErr);
        }
      }
    }

    // Run the compounding calculations
    const summary = runRoiCalculations(initialAmount, years, cagrMin, cagrMax, rentMin, rentMax);

    // Takeaways are worked out from the figures above — no generated prose.
    const takeaways = [
      `Investing ${inr(initialAmount)} in ${corridorName} grows to between ${inr(summary.finalRealEstateMin)} and ${inr(summary.finalRealEstateMax)} over ${years} years in our conservative-to-optimistic scenarios${summary.finalRealEstateMin > summary.finalFD ? ", ahead of a fixed deposit even in the conservative case" : summary.finalRealEstateMax > summary.finalFD ? " — the conservative case trails a fixed deposit, so the outcome depends on the area delivering" : ", which trails a fixed deposit"}.`,
      rentMax > 0
        ? `Rental yield is taken as ${rentMin === rentMax ? `${rentMin}%` : `${rentMin}–${rentMax}%`} a year (${rentMin === CITY.rentalYield.value && rentMax === CITY.rentalYield.value ? "Hyderabad average, ANAROCK Q2 2026" : "gross yield measured from rental listings in this corridor"}).`
        : `Plots earn no rent, so the return depends entirely on price growth and on how easily you can resell.`,
      !corridorId || corridorId === "CUSTOM"
        ? `These are Hyderabad-wide figures — pick a corridor to use its own price scenarios, rent and infrastructure.`
        : infrastructureTailwinds.length
        ? `Infrastructure behind the optimistic case: ${infrastructureTailwinds.map((p) => `${p.name} (${String(p.status).replace(/_/g, " ").toLowerCase()})`).join("; ")}. Projects not yet under construction can take years to start — the conservative case assumes little of them.`
        : `No infrastructure project tracked for ${corridorName} is under way, so the range leans on Hyderabad's citywide price growth.`,
    ];

    return NextResponse.json({
      success: true,
      summary,
      takeaways,
      corridorName,
      infrastructureTailwinds
    });
  } catch (error: any) {
    console.error("Error in POST /api/calculator/calculate:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
