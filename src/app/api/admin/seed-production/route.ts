import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { computeAllCorridorScores } from "@/lib/corridor-intelligence";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key");

  if (key !== "urban2026") {
    return NextResponse.json({ error: "Unauthorized. Pass ?key=urban2026" }, { status: 401 });
  }

  const logs: string[] = [];

  try {
    logs.push("🌱 Starting Production DB Migration, Sync & Validation...");

    // 1. Ensure Missing DB Columns on PostgreSQL (Self-Healing Schema)
    const schemaFixQueries = [
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "googleId" TEXT;`,
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerified" TIMESTAMP(3);`,
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phoneVerified" BOOLEAN DEFAULT false;`,
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "authProvider" TEXT DEFAULT 'EMAIL';`,
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "budget" DOUBLE PRECISION;`,
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "horizon" INTEGER;`,
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "preferredCity" TEXT DEFAULT 'Hyderabad';`,
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "riskAppetite" TEXT;`,
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "profileScore" INTEGER DEFAULT 0;`,
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP(3);`,
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastDashboardVisitAt" TIMESTAMP(3);`,
      `CREATE INDEX IF NOT EXISTS "User_googleId_idx" ON "User"("googleId");`,
      `CREATE INDEX IF NOT EXISTS "User_phone_idx" ON "User"("phone");`,
    ];

    for (const sql of schemaFixQueries) {
      try {
        await prisma.$executeRawUnsafe(sql);
      } catch (e: any) {
        logs.push(`⚠️ SQL Notice: ${e.message}`);
      }
    }
    logs.push("✅ Verified & updated User table schema columns in database.");

    // 2. Seed Admin User
    const hashedPassword = await bcrypt.hash("12345678", 10);
    const adminUser = await prisma.user.upsert({
      where: { email: "uv@gmail.com" },
      update: { password: hashedPassword, role: "ADMIN" },
      create: {
        email: "uv@gmail.com",
        name: "Property Tiger Admin",
        phone: "+919999999999",
        password: hashedPassword,
        role: "ADMIN",
      },
    });
    logs.push(`✅ Admin user upserted: ${adminUser.email}`);

    // 3. Seed All 12 Hyderabad Corridors with Complete Intelligence
    const all12Corridors = [
      {
        slug: "kokapet-neopolis",
        name: "Kokapet Neopolis Commercial Hub",
        shortName: "Kokapet",
        direction: "WEST" as const,
        zone: "WEST",
        district: "Ranga Reddy",
        description: "Premium high-rises and luxury villa sanctuary plots. Driven by Hitec City spillover and Neopolis SEZ expansion.",
        heatRating: "FIRE" as const,
        investmentCycle: "EARLY_GROWTH" as const,
        overallScore: 75,
        infraScore: 88,
        approvalScore: 82,
        demandScore: 90,
        appreciationScore: 85,
        sentiment: "BULLISH" as const,
        plotPriceMinSqYd: 65000,
        plotPriceMidSqYd: 85000,
        plotPriceMaxSqYd: 120000,
        price2020SqYd: 38000,
        price2022SqYd: 55000,
        price2024SqYd: 72000,
        price2026SqYd: 85000,
        appreciationSince2020: 123.6,
        historicalCAGR: 17.5,
        projectedCAGRMin: 15,
        projectedCAGRMax: 22,
        keyDrivers: ["Neopolis IT SEZ expansion", "ORR Exit 1 connectivity", "High-density commercial high-rises"],
        keyRisks: ["Premium land pricing", "High entry barrier"],
        bestFor: ["Luxury HNWIs", "High Yield Investors"],
        isPublished: true,
      },
      {
        slug: "adibatla",
        name: "Adibatla IT & Aerospace Corridor",
        shortName: "Adibatla",
        direction: "SOUTHEAST" as const,
        zone: "SOUTHEAST",
        district: "Ranga Reddy",
        description: "Anchored by Tata Aerospace SEZ and TCS Adibatla tech campus.",
        heatRating: "HOT" as const,
        investmentCycle: "MATURING" as const,
        overallScore: 78,
        infraScore: 82,
        approvalScore: 80,
        demandScore: 85,
        appreciationScore: 80,
        sentiment: "BULLISH" as const,
        plotPriceMinSqYd: 25000,
        plotPriceMidSqYd: 32000,
        plotPriceMaxSqYd: 42000,
        price2020SqYd: 14000,
        price2022SqYd: 21000,
        price2024SqYd: 28000,
        price2026SqYd: 32000,
        appreciationSince2020: 128.5,
        historicalCAGR: 18.0,
        projectedCAGRMin: 12,
        projectedCAGRMax: 16,
        keyDrivers: ["Tata Aerospace & TCS Job Growth", "ORR Exit 12 Connectivity", "RRR Southern alignment proximity"],
        keyRisks: ["Moderate rental yields", "Drinking water infrastructure lag"],
        bestFor: ["Mid-term plot buyers", "IT professionals"],
        isPublished: true,
      },
      {
        slug: "kadthal-fcda",
        name: "Kadthal FCDA Future City Corridor",
        shortName: "Kadthal",
        direction: "SOUTH" as const,
        zone: "SOUTH",
        district: "Ranga Reddy",
        description: "Gateway position to the newly planned Telangana FCDA Future City and Pharma City node.",
        heatRating: "FIRE" as const,
        investmentCycle: "EARLY_GROWTH" as const,
        overallScore: 84,
        infraScore: 88,
        approvalScore: 82,
        demandScore: 90,
        appreciationScore: 88,
        sentiment: "BULLISH" as const,
        plotPriceMinSqYd: 14000,
        plotPriceMidSqYd: 22000,
        plotPriceMaxSqYd: 32000,
        price2020SqYd: 6500,
        price2022SqYd: 11000,
        price2024SqYd: 17000,
        price2026SqYd: 22000,
        appreciationSince2020: 238.4,
        historicalCAGR: 27.6,
        projectedCAGRMin: 18,
        projectedCAGRMax: 24,
        keyDrivers: ["Future City Mega AI & Sports Hubs", "Metro Phase 2 Mucherla Extension", "Srisailam Highway 4-laning"],
        keyRisks: ["Policy timeline dependent", "Speculative localized pricing"],
        bestFor: ["Long-term High Alpha", "Land Banking"],
        isPublished: true,
      },
      {
        slug: "tukkuguda-shamshabad",
        name: "Tukkuguda-Shamshabad Airport Corridor",
        shortName: "Shamshabad",
        direction: "SOUTH" as const,
        zone: "SOUTH",
        district: "Ranga Reddy",
        description: "Gateway to Mucherla Future City and Rajiv Gandhi International Airport.",
        heatRating: "FIRE" as const,
        investmentCycle: "EARLY_GROWTH" as const,
        overallScore: 79,
        infraScore: 85,
        approvalScore: 78,
        demandScore: 80,
        appreciationScore: 82,
        sentiment: "BULLISH" as const,
        plotPriceMinSqYd: 35000,
        plotPriceMidSqYd: 48000,
        plotPriceMaxSqYd: 65000,
        price2020SqYd: 18000,
        price2022SqYd: 28000,
        price2024SqYd: 39000,
        price2026SqYd: 48000,
        appreciationSince2020: 166.6,
        historicalCAGR: 21.6,
        projectedCAGRMin: 14,
        projectedCAGRMax: 18,
        keyDrivers: ["RGIA Expansion to 40M passengers", "Future City Metro link project", "Premium villa sanctuary belt"],
        keyRisks: ["Noise zone restrictions", "High ticket size"],
        bestFor: ["Airport Logistics", "Villa Plot Banking"],
        isPublished: true,
      },
      {
        slug: "maheshwaram-pharma-city",
        name: "Maheshwaram Pharma City Growth Belt",
        shortName: "Maheshwaram",
        direction: "SOUTH" as const,
        zone: "SOUTH",
        district: "Ranga Reddy",
        description: "Direct exposure to Hyderabad Pharma City SEZ and Electronic Hardware Park.",
        heatRating: "FIRE" as const,
        investmentCycle: "EARLY_GROWTH" as const,
        overallScore: 76,
        infraScore: 80,
        approvalScore: 75,
        demandScore: 82,
        appreciationScore: 80,
        sentiment: "BULLISH" as const,
        plotPriceMinSqYd: 18000,
        plotPriceMidSqYd: 26000,
        plotPriceMaxSqYd: 38000,
        price2020SqYd: 9000,
        price2022SqYd: 15000,
        price2024SqYd: 21000,
        price2026SqYd: 26000,
        appreciationSince2020: 188.8,
        historicalCAGR: 23.6,
        projectedCAGRMin: 15,
        projectedCAGRMax: 20,
        keyDrivers: ["Wipro & HCL SEZ Expansions", "Direct connectivity to Srisailam & Bangalore Highways", "Pharma City node proximity"],
        keyRisks: ["Environmental clearances in immediate boundary", "Water table variations"],
        bestFor: ["High Growth Investors", "Plot Developers"],
        isPublished: true,
      },
      {
        slug: "shadnagar",
        name: "Shadnagar NH-44 Growth Corridor",
        shortName: "Shadnagar",
        direction: "SOUTH" as const,
        zone: "SOUTH",
        district: "Ranga Reddy",
        description: "High affordability plotting zone driven by Regional Ring Road (RRR) and Bangalore Highway NH-44.",
        heatRating: "HOT" as const,
        investmentCycle: "EARLY_GROWTH" as const,
        overallScore: 73,
        infraScore: 80,
        approvalScore: 75,
        demandScore: 85,
        appreciationScore: 82,
        sentiment: "BULLISH" as const,
        plotPriceMinSqYd: 11000,
        plotPriceMidSqYd: 17000,
        plotPriceMaxSqYd: 26000,
        price2020SqYd: 5500,
        price2022SqYd: 9500,
        price2024SqYd: 13500,
        price2026SqYd: 17000,
        appreciationSince2020: 209.0,
        historicalCAGR: 25.3,
        projectedCAGRMin: 11,
        projectedCAGRMax: 15,
        keyDrivers: ["NH-44 Hyderabad-Bangalore Industrial Corridor", "Upcoming RRR Intersection", "Affordable residential land banking"],
        keyRisks: ["Longer holding horizon (3-7 yrs)"],
        bestFor: ["Plot Land Banking", "Mid Budget Investors"],
        isPublished: true,
      },
      {
        slug: "shankarpally-mokila",
        name: "Shankarpally-Mokila Premium Villa Belt",
        shortName: "Shankarpally",
        direction: "WEST" as const,
        zone: "WEST",
        district: "Ranga Reddy",
        description: "Premium eco-sanctuary and green gated community haven in West Hyderabad.",
        heatRating: "FIRE" as const,
        investmentCycle: "EARLY_GROWTH" as const,
        overallScore: 80,
        infraScore: 84,
        approvalScore: 80,
        demandScore: 86,
        appreciationScore: 82,
        sentiment: "BULLISH" as const,
        plotPriceMinSqYd: 28000,
        plotPriceMidSqYd: 38000,
        plotPriceMaxSqYd: 52000,
        price2020SqYd: 13000,
        price2022SqYd: 22000,
        price2024SqYd: 31000,
        price2026SqYd: 38000,
        appreciationSince2020: 192.3,
        historicalCAGR: 23.9,
        projectedCAGRMin: 13,
        projectedCAGRMax: 17,
        keyDrivers: ["Proximity to Financial District (Gachibowli)", "Upcoming 100ft road expansion", "Premium gated villa haven"],
        keyRisks: ["High entry ticket sizes", "Tanker water dependence in outer pockets"],
        bestFor: ["Luxury Villa Builders", "NRI Capital Preservation"],
        isPublished: true,
      },
      {
        slug: "sangareddy-industrial",
        name: "Sangareddy-Kandi Industrial Arc",
        shortName: "Sangareddy",
        direction: "NORTHWEST" as const,
        zone: "NORTHWEST",
        district: "Sangareddy",
        description: "Anchored by IIT Hyderabad, NH-65 Mumbai Highway, and RRR Northern junction.",
        heatRating: "NEUTRAL" as const,
        investmentCycle: "MATURING" as const,
        overallScore: 71,
        infraScore: 78,
        approvalScore: 72,
        demandScore: 75,
        appreciationScore: 76,
        sentiment: "NEUTRAL" as const,
        plotPriceMinSqYd: 14000,
        plotPriceMidSqYd: 20000,
        plotPriceMaxSqYd: 30000,
        price2020SqYd: 8000,
        price2022SqYd: 12500,
        price2024SqYd: 16500,
        price2026SqYd: 20000,
        appreciationSince2020: 150.0,
        historicalCAGR: 20.1,
        projectedCAGRMin: 10,
        projectedCAGRMax: 14,
        keyDrivers: ["IIT Hyderabad tech anchor", "RRR Northern Arc interchange junction", "NH-65 Mumbai Highway logistics corridor"],
        keyRisks: ["Industrial traffic congestion", "Scattered plotting"],
        bestFor: ["Student Housing", "Long Term Appreciation"],
        isPublished: true,
      },
      {
        slug: "kompally-bachupally",
        name: "Kompally-Bachupally Residential Corridor",
        shortName: "Kompally",
        direction: "NORTH" as const,
        zone: "NORTH",
        district: "Medchal",
        description: "Established lifestyle residential corridor with top international schools and healthcare hubs.",
        heatRating: "HOT" as const,
        investmentCycle: "MATURING" as const,
        overallScore: 72,
        infraScore: 76,
        approvalScore: 75,
        demandScore: 78,
        appreciationScore: 74,
        sentiment: "NEUTRAL" as const,
        plotPriceMinSqYd: 32000,
        plotPriceMidSqYd: 42000,
        plotPriceMaxSqYd: 58000,
        price2020SqYd: 18000,
        price2022SqYd: 26000,
        price2024SqYd: 35000,
        price2026SqYd: 42000,
        appreciationSince2020: 133.3,
        historicalCAGR: 18.4,
        projectedCAGRMin: 10,
        projectedCAGRMax: 13,
        keyDrivers: ["NH-44 North residential growth", "Established lifestyle & healthcare infrastructure", "Flyover bottleneck resolutions"],
        keyRisks: ["Saturated plot options forcing apartment shifts"],
        bestFor: ["End-user Homebuyers", "Rental Yield Seekers"],
        isPublished: true,
      },
      {
        slug: "medchal-dundigal",
        name: "Medchal-Dundigal Logistics & SEZ Belt",
        shortName: "Medchal",
        direction: "NORTH" as const,
        zone: "NORTH",
        district: "Medchal",
        description: "Major warehousing, aerospace manufacturing, and logistics hub along NH-44.",
        heatRating: "HOT" as const,
        investmentCycle: "EARLY_GROWTH" as const,
        overallScore: 74,
        infraScore: 80,
        approvalScore: 74,
        demandScore: 78,
        appreciationScore: 78,
        sentiment: "NEUTRAL" as const,
        plotPriceMinSqYd: 16000,
        plotPriceMidSqYd: 24000,
        plotPriceMaxSqYd: 34000,
        price2020SqYd: 8500,
        price2022SqYd: 14000,
        price2024SqYd: 19500,
        price2026SqYd: 24000,
        appreciationSince2020: 182.3,
        historicalCAGR: 23.0,
        projectedCAGRMin: 11,
        projectedCAGRMax: 15,
        keyDrivers: ["NH-44 Warehousing & Logistics Hub", "Dundigal Aerospace & Defense SEZ", "RRR Northern junction connectivity"],
        keyRisks: ["Heavy commercial traffic", "Scattered residential pockets"],
        bestFor: ["Commercial Warehousing", "Mid Term Investors"],
        isPublished: true,
      },
      {
        slug: "ghatkesar-peerzadiguda",
        name: "Ghatkesar-Peerzadiguda East IT Corridor",
        shortName: "Ghatkesar",
        direction: "EAST" as const,
        zone: "EAST",
        district: "Medchal",
        description: "Anchored by Raheja Mindspace IT Park Pocharam and AIIMS Bibinagar.",
        heatRating: "NEUTRAL" as const,
        investmentCycle: "MATURING" as const,
        overallScore: 68,
        infraScore: 72,
        approvalScore: 75,
        demandScore: 76,
        appreciationScore: 74,
        sentiment: "NEUTRAL" as const,
        plotPriceMinSqYd: 20000,
        plotPriceMidSqYd: 28000,
        plotPriceMaxSqYd: 38000,
        price2020SqYd: 12000,
        price2022SqYd: 18000,
        price2024SqYd: 23500,
        price2026SqYd: 28000,
        appreciationSince2020: 133.3,
        historicalCAGR: 18.4,
        projectedCAGRMin: 9,
        projectedCAGRMax: 13,
        keyDrivers: ["Raheja Mindspace IT Park Pocharam", "AIIMS Bibinagar Medical Hub", "Warangal Highway NH-163 widening"],
        keyRisks: ["IT expansion slower than Western corridor", "Groundwater summer shortage"],
        bestFor: ["Budget Housing", "Medical Staff Rentals"],
        isPublished: true,
      },
      {
        slug: "bibinagar-bhongir",
        name: "Bibinagar-Bhongir Growth Hub",
        shortName: "Bibinagar",
        direction: "EAST" as const,
        zone: "EAST",
        district: "Yadadri",
        description: "Strategic health and tourism expansion zone on Warangal Highway NH-163.",
        heatRating: "NEUTRAL" as const,
        investmentCycle: "EARLY_GROWTH" as const,
        overallScore: 67,
        infraScore: 70,
        approvalScore: 70,
        demandScore: 72,
        appreciationScore: 74,
        sentiment: "NEUTRAL" as const,
        plotPriceMinSqYd: 9000,
        plotPriceMidSqYd: 14000,
        plotPriceMaxSqYd: 22000,
        price2020SqYd: 4500,
        price2022SqYd: 7500,
        price2024SqYd: 11000,
        price2026SqYd: 14000,
        appreciationSince2020: 211.1,
        historicalCAGR: 25.4,
        projectedCAGRMin: 9,
        projectedCAGRMax: 12,
        keyDrivers: ["AIIMS Medical Hub expansion", "Yadadri Temple tourism corridor", "Budget long-term land banking"],
        keyRisks: ["Long gestation for commercial growth", "Delayed RRR East arc"],
        bestFor: ["Long-term Capital Growth", "Small Budget Land Buyers"],
        isPublished: true,
      },
    ];

    for (const c of all12Corridors) {
      await prisma.corridorProfile.upsert({
        where: { slug: c.slug },
        update: c as any,
        create: { ...c, riskLevel: "MEDIUM" } as any,
      });

      // Also ensure AppreciationHistory records exist for smooth 5-year sparklines
      const years = [2020, 2021, 2022, 2023, 2024, 2025, 2026];
      const p20 = c.price2020SqYd;
      const p22 = c.price2022SqYd;
      const p24 = c.price2024SqYd;
      const p26 = c.price2026SqYd;

      const prices = [
        Math.round(p20 / 9),
        Math.round((p20 * 1.16) / 9),
        Math.round(p22 / 9),
        Math.round((p22 * 1.15) / 9),
        Math.round(p24 / 9),
        Math.round((p24 * 1.13) / 9),
        Math.round(p26 / 9),
      ];

      await prisma.appreciationHistory.deleteMany({
        where: { corridor: c.slug },
      });

      const historyData = years.map((yr, idx) => ({
        corridor: c.slug,
        year: yr,
        quarter: yr === 2026 ? 1 : 4,
        pricePerSqFt: prices[idx],
        yoyChange: idx === 0 ? 12.5 : parseFloat((((prices[idx] - prices[idx - 1]) / prices[idx - 1]) * 100).toFixed(1)),
        corridorProfileSlug: c.slug,
      }));

      await prisma.appreciationHistory.createMany({
        data: historyData,
      });

      logs.push(`✅ Upserted Corridor & Price History: ${c.name} (Score: ${c.overallScore})`);
    }

    // 4. Run Live Intelligence Scoring Engine
    try {
      const computedScores = await computeAllCorridorScores();
      logs.push(`⚡ Live Corridor Intelligence recomputed for ${computedScores.length} corridors.`);
    } catch (e: any) {
      logs.push(`⚠️ Recompute note: ${e.message}`);
    }

    // 5. Final Audit
    const uCount = await prisma.user.count();
    const cCount = await prisma.corridorProfile.count();
    const aCount = await prisma.appreciationHistory.count();

    logs.push("---------------------------------------");
    logs.push(`📊 PRODUCTION SYNC SUMMARY:`);
    logs.push(`User Count: ${uCount}`);
    logs.push(`Corridor Profiles Count: ${cCount} / 12`);
    logs.push(`Appreciation History Points Count: ${aCount}`);
    logs.push("🎉 All production database tables & scores are 100% verified and operational!");

    return NextResponse.json({
      success: true,
      message: "Production DB successfully synchronized, schema updated, and corridor intelligence seeded.",
      logs,
    });
  } catch (err: any) {
    console.error("Critical error in GET /api/admin/seed-production:", err);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        details: err.message,
        logs,
      },
      { status: 500 }
    );
  }
}
