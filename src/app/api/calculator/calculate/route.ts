import { NextResponse } from "next/server";
import { runRoiCalculations } from "@/lib/calculator";
import prisma from "@/lib/prisma";
import { ANCHOR_RATES } from "@/lib/market/forecast";
import { CITY } from "@/lib/market/anchors";
import Anthropic from "@anthropic-ai/sdk";

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
      customRentMin = 0, 
      customRentMax = 0 
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
        if (primary === "plot" && customRentMin === undefined && customRentMax === undefined) { rentMin = 0; rentMax = 0; }

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
            orderBy: {
              reImpactScore: "desc"
            }
          });

          // Listed for context only — the corridor's growth range already
          // includes its infrastructure premium, so it isn't added again.
          infrastructureTailwinds = upcomingInfra.slice(0, 2).map(p => ({
            name: p.name,
            status: p.status,
            reImpactScore: p.reImpactScore,
            estimatedCompletion: p.estimatedCompletion
          }));
        } catch (dbErr) {
          console.error("Failed to query upcoming infra for calculator", dbErr);
        }
      }
    }

    // Run the compounding calculations
    const summary = runRoiCalculations(initialAmount, years, cagrMin, cagrMax, rentMin, rentMax);

    // Call Anthropic Claude for takeaways if API key is valid, else use local heuristics fallback
    let takeaways = [
      `Investing ${inr(initialAmount)} in ${corridorName} grows to between ${inr(summary.finalRealEstateMin)} and ${inr(summary.finalRealEstateMax)} over ${years} years in our conservative-to-optimistic scenarios${summary.finalRealEstateMin > summary.finalFD ? ", ahead of a fixed deposit even in the conservative case" : summary.finalRealEstateMax > summary.finalFD ? " — the conservative case trails a fixed deposit, so the outcome depends on the area delivering" : ", which trails a fixed deposit"}.`,
      rentMax > 0
        ? `Rental yield is taken as ${rentMin === rentMax ? `${rentMin}%` : `${rentMin}–${rentMax}%`} a year (Hyderabad average, ANAROCK Q2 2026).`
        : `Plots earn no rent, so the return depends entirely on price growth and on how easily you can resell.`,
      `Key infrastructure projects in the ${corridorName} corridor serve as major growth multipliers, though buyers should ensure RERA compliance to mitigate construction delay risks.`
    ];

    const apiKey = process.env.ANTHROPIC_API_KEY;
    const isMockKey = !apiKey || apiKey === "mock-anthropic-key-for-local-testing" || apiKey.trim() === "";

    if (!isMockKey) {
      try {
        const anthropic = new Anthropic({ apiKey });
        const systemPrompt = `You are a professional real estate investment analyst specializing in Hyderabad, Telangana. Provide responses in valid JSON only with no markdown or other text.`;
        
        const userPrompt = `A client is evaluating a real estate investment with these metrics:
- Initial Investment: ₹${initialAmount} Lakhs
- Corridor: ${corridorName}
- Duration: ${years} Years
- Projected Capital Appreciation CAGR: ${cagrMin}% to ${cagrMax}%
- Projected Rental Yield: ${rentMin}% to ${rentMax}%

The compounding engine projects:
- Real Estate Value: ₹${summary.finalRealEstateMin}L to ₹${summary.finalRealEstateMax}L
- Fixed Deposit: ₹${summary.finalFD}L (at 6.5% CAGR)
- Nifty 50 Index: ₹${summary.finalNifty}L (at 12.0% CAGR)
- Gold Value: ₹${summary.finalGold}L (at 9.0% CAGR)

Provide exactly 3 bullet points of professional, actionable investment takeaways (1-2 sentences each) explaining:
1. The significance of the appreciation & rental yield mix for this corridor.
2. How it compares to liquid asset classes (FD, Nifty, Gold) over this horizon.
3. Risk mitigation tips for investing in this corridor.

Respond with this exact JSON structure:
{
  "takeaways": [
    "Takeaway bullet 1",
    "Takeaway bullet 2",
    "Takeaway bullet 3"
  ]
}
Do not return markdown, do not return codeblocks.`;

        const response = await anthropic.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
        });

        const content = response.content[0].type === "text" ? response.content[0].text : "";
        const jsonStart = content.indexOf("{");
        const jsonEnd = content.lastIndexOf("}");
        
        if (jsonStart !== -1 && jsonEnd !== -1) {
          const parsed = JSON.parse(content.substring(jsonStart, jsonEnd + 1));
          if (Array.isArray(parsed.takeaways) && parsed.takeaways.length === 3) {
            takeaways = parsed.takeaways;
          }
        }
      } catch (err) {
        console.error("Failed to generate Claude takeaways, using fallbacks:", err);
      }
    }

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
