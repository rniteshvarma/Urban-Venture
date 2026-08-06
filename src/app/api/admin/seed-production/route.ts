import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key");

  if (key !== "urban2026") {
    return NextResponse.json({ error: "Unauthorized. Pass ?key=urban2026" }, { status: 401 });
  }

  const logs: string[] = [];

  try {
    logs.push("🌱 Starting Production DB Seed & Validation...");

    // 1. Seed User
    const hashedPassword = await bcrypt.hash("12345678", 10);
    const adminUser = await prisma.user.upsert({
      where: { email: "uv@gmail.com" },
      update: { password: hashedPassword, role: "ADMIN" },
      create: {
        email: "uv@gmail.com",
        name: "Urban Ventures Admin",
        phone: "+919999999999",
        password: hashedPassword,
        role: "ADMIN"
      }
    });
    logs.push(`✅ Admin user upserted: ${adminUser.email}`);

    // 2. Seed Corridors
    const sampleCorridors = [
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
        keyDrivers: ["Neopolis IT SEZ expansion", "ORR Exit 1 connectivity", "High-density commercial high-rises"],
        keyRisks: ["Premium land pricing", "High entry barrier"],
        bestFor: ["Luxury HNWIs", "High Yield Investors"],
        isPublished: true
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
        sentiment: "NEUTRAL" as const,
        keyDrivers: ["Regional Ring Road (RRR) junction", "Industrial SEZ corridor", "High affordability plot rates"],
        keyRisks: ["Longer holding horizon (3-7 yrs)"],
        bestFor: ["Plot Land Banking", "Mid Budget Investors"],
        isPublished: true
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
        overallScore: 73,
        infraScore: 78,
        approvalScore: 80,
        demandScore: 82,
        appreciationScore: 78,
        sentiment: "NEUTRAL" as const,
        keyDrivers: ["Tata Aerospace SEZ jobs expansion", "TCS Adibatla IT campus", "ORR Exit 12 connection"],
        keyRisks: ["Moderate rental yields"],
        bestFor: ["IT Staff Rental Yields", "Villa Community"],
        isPublished: true
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
        overallScore: 70,
        infraScore: 85,
        approvalScore: 78,
        demandScore: 80,
        appreciationScore: 82,
        sentiment: "NEUTRAL" as const,
        keyDrivers: ["RGIA Airport expansion", "Fab City & Aerospace SEZ", "Proposed Metro Phase 2 Airport link"],
        keyRisks: ["Noise zone restrictions"],
        bestFor: ["Airport Logistics", "Villa Plot Banking"],
        isPublished: true
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
        keyDrivers: ["Pocharam IT campus", "AIIMS Medical Hub", "Warangal Highway NH-163"],
        keyRisks: ["Slower commercial expansion"],
        bestFor: ["Budget Housing", "Medical Staff Rentals"],
        isPublished: true
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
        overallScore: 67,
        infraScore: 75,
        approvalScore: 70,
        demandScore: 78,
        appreciationScore: 85,
        sentiment: "NEUTRAL" as const,
        keyDrivers: ["Future City sports & AI hub", "Srisailam Highway extension", "Pharma City proximity"],
        keyRisks: ["Policy timeline dependent"],
        bestFor: ["Long-term High Alpha", "Land Banking"],
        isPublished: true
      }
    ];

    for (const c of sampleCorridors) {
      await prisma.corridorProfile.upsert({
        where: { slug: c.slug },
        update: c,
        create: c
      });
      logs.push(`✅ Corridor Profile upserted: ${c.name}`);
    }

    // 3. Validation Audit
    const uCount = await prisma.user.count();
    const cCount = await prisma.corridorProfile.count();
    const pCount = await prisma.project.count();

    logs.push("---------------------------------------");
    logs.push(`📊 AUDIT RESULTS:`);
    logs.push(`User Count: ${uCount}`);
    logs.push(`Corridor Profiles Count: ${cCount}`);
    logs.push(`Projects Count: ${pCount}`);
    logs.push("---------------------------------------");
    logs.push("🎉 SEED & VALIDATION COMPLETED SUCCESSFULLY!");

    return NextResponse.json({
      success: true,
      logs,
      audit: {
        users: uCount,
        corridors: cCount,
        projects: pCount
      }
    });
  } catch (err: any) {
    console.error("Error in production seed route:", err);
    return NextResponse.json({
      success: false,
      error: err.message,
      logs
    }, { status: 500 });
  }
}
