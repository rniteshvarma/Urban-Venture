import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";

// Fallback AI Analysis reports for local development / mock API keys
function getFallbackReport(corridor: string) {
  const reports: Record<string, any> = {
    "Shadnagar": {
      headline: "Shadnagar: The Gateway to South Hyderabad's Infrastructure Expansion",
      investmentThesis: "Shadnagar presents a high-growth plotting opportunity. Driven by the upcoming Regional Ring Road (RRR) Southern Corridor and its strategic proximity to the Hyderabad Pharma City industrial belt, land values are projected to rise steadily. It offers an affordable entry point for investors seeking long-term capital multiplication.",
      nearTermCatalysts: [
        "Commencement of RRR Northern Corridor construction linking NH-44.",
        "Pharma City Phase 1 industrial plot allocations beginning operations.",
        "Additional layout approvals under HMDA jurisdiction raising plot legality."
      ],
      longTermDrivers: [
        "Direct connection to central Hyderabad via the expanded NH-44 Expressway.",
        "Expected demographic shifts as the Pharma City cluster employs over 5 lakh workers."
      ],
      risks: [
        "Delayed timeline for public water grid and local utility layouts.",
        "Speculative bubble risk in distant layout pockets."
      ],
      bestEntryWindow: "Next 12-18 months before active RRR Southern stretch construction begins.",
      exitStrategy: "Resale to secondary retail buyers or land banking developers after 5-7 years.",
      comparativeAdvantage: "Offers 3x lower entry cost compared to Shamshabad and Kokapet with higher raw land appreciation potential.",
      targetInvestorProfile: "Long-term land banking investors, NRI plot buyers, and high-risk speculators.",
      priceOutlook: {
        conservative: "10-12% CAGR over 5 years",
        base: "14-16% CAGR over 5 years",
        optimistic: "18-22% CAGR over 5 years"
      }
    },
    "Pharma City": {
      headline: "Pharma City Influence Zone: Harnessing Industrial Workforce Demands",
      investmentThesis: "Positioned directly surrounding one of the world's largest pharma manufacturing clusters, this corridor is poised to become Hyderabad's most active residential rental market. Developer focus is shifting rapidly to match the upcoming worker housing demands.",
      nearTermCatalysts: [
        "Inauguration of major pharma manufacturing facilities (Dr. Reddy's, Aurobindo).",
        "Final approval of the Metro extension planning from RGIA to Pharma City.",
        "Infrastructure development of arterial link highways."
      ],
      longTermDrivers: [
        "Massive employee absorption creating consistent rental yields.",
        "Master plan zoning creating satellite townships."
      ],
      risks: [
        "Environmental regulatory checks in immediate industrial borders.",
        "Infrastructure gestation timelines extending beyond 5 years."
      ],
      bestEntryWindow: "Next 6-12 months as initial corporate manufacturing units start construction.",
      exitStrategy: "Constructing multi-family rental units or reselling residential layouts to developers.",
      comparativeAdvantage: "Higher rental yield potential (4-6%) than outer plotting corridors like Yadadri.",
      targetInvestorProfile: "Medium-risk yield-seeking investors and portfolio diversifiers.",
      priceOutlook: {
        conservative: "12-14% CAGR over 5 years",
        base: "16-18% CAGR over 5 years",
        optimistic: "20-24% CAGR over 5 years"
      }
    },
    "Kokapet": {
      headline: "Kokapet: High-Value Luxury Commercial & Residential Sovereign",
      investmentThesis: "Kokapet is West Hyderabad's crown jewel. Backed by Neopolis IT SEZ and ORR Exit 1, it represents the ultimate HNI and institutional investment playground. High liquidity and institutional quality backing secure low risk and robust returns.",
      nearTermCatalysts: [
        "Auctioning of high-value commercial Neopolis land parcels.",
        "Completion of major multi-lane trumpet expressways linking the financial hub.",
        "High-density commercial towers launching occupancy."
      ],
      longTermDrivers: [
        "Concentrated corporate IT wealth in West Hyderabad.",
        "UHNW lifestyle demand driving high-end villa and skyscraper purchases."
      ],
      risks: [
        "High initial ticket size limiting entry to affluent investors.",
        "Potential localized residential supply glut in the premium skyscraper segment."
      ],
      bestEntryWindow: "Opportunistic entry during pre-launch sales in Neopolis expansions.",
      exitStrategy: "Reselling premium apartments to corporate professionals or corporate leasing.",
      comparativeAdvantage: "Unmatched liquidity and high rental yield velocity compared to outer corridors.",
      targetInvestorProfile: "HNIs, NRI corporate executives, and institutional wealth builders.",
      priceOutlook: {
        conservative: "8-10% CAGR over 5 years",
        base: "12-14% CAGR over 5 years",
        optimistic: "16-18% CAGR over 5 years"
      }
    }
  };

  const defaultReport = {
    headline: `${corridor} Corridor: Emerging Real Estate Growth Vector`,
    investmentThesis: `The ${corridor} corridor is exhibiting positive appreciation and developer activity, anchored by government zoning plans and connectivity enhancements. It represents a balanced investment zone.`,
    nearTermCatalysts: [
      "Zoning approvals for highway extensions.",
      "New layout launches by regional builders.",
      "Increased portal search inquiry volumes."
    ],
    longTermDrivers: [
      "Connectivity loops via ORR and arterial roads.",
      "Expanding urban sprawl matching job growth."
    ],
    risks: [
      "Pace of commercial infrastructure realization.",
      "Localized utility grid connectivity delays."
    ],
    bestEntryWindow: "Next 12 months as initial permissions get registered.",
    exitStrategy: "Resell plots or flats after infrastructure milestones mature.",
    comparativeAdvantage: "Provides stable growth at a moderate entry ticket size compared to central zones.",
    targetInvestorProfile: "Conservative long-term home buyers and balanced portfolio builders.",
    priceOutlook: {
      conservative: "9-11% CAGR over 5 years",
      base: "12-14% CAGR over 5 years",
      optimistic: "15-18% CAGR over 5 years"
    }
  };

  return reports[corridor] || defaultReport;
}

// GET /api/market/corridors/[slug]/analysis - AI analyst deep dive report
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const decodedSlug = decodeURIComponent(slug);

    const metric = await prisma.corridorProfile.findFirst({
      where: {
        OR: [
          { slug: { equals: decodedSlug, mode: "insensitive" } },
          { name: { equals: decodedSlug, mode: "insensitive" } },
          { shortName: { equals: decodedSlug, mode: "insensitive" } }
        ]
      }
    });

    if (!metric) {
      return NextResponse.json({ error: "Corridor not found" }, { status: 404 });
    }

    const corridorName = metric.slug;

    // Check File Cache
    const cacheDir = path.join(process.cwd(), "src", "lib", "cache");
    const cacheFile = path.join(cacheDir, `corridor-analysis-${corridorName.replace(/\s+/g, "-").toLowerCase()}.json`);

    if (fs.existsSync(cacheFile)) {
      const stats = fs.statSync(cacheFile);
      const fileAgeHrs = (Date.now() - stats.mtimeMs) / (1000 * 60 * 60);

      if (fileAgeHrs < 24) {
        try {
          const cachedData = JSON.parse(fs.readFileSync(cacheFile, "utf-8"));
          return NextResponse.json({
            ...cachedData,
            cached: true,
            generatedAt: stats.mtime
          });
        } catch (e) {
          console.warn("Failed to read cached analysis, regenerating...");
        }
      }
    }

    // Fetch context data
    const appreciation = await prisma.appreciationHistory.findMany({
      where: { corridor: corridorName },
      orderBy: { year: "asc" }
    });

    const demand = await prisma.demandTrend.findMany({
      where: { corridor: corridorName },
      orderBy: [{ year: "asc" }, { month: "asc" }],
      take: 24
    });

    const infra = await prisma.infraProject.findMany({
      where: { affectedCorridorSlugs: { has: corridorName }, isPublished: true }
    });

    const approvals = await prisma.approvalRecord.findMany({
      where: { corridor: corridorName, isPublished: true }
    });

    const intel = await prisma.corridorIntelligence.findUnique({
      where: { corridor: corridorName }
    });

    // Determine if we call Claude or generate fallback
    let analysisResult: any;

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey || apiKey === "mock-anthropic-key-for-local-testing" || apiKey.trim() === "") {
      console.log(`Generating fallback analysis report for ${corridorName}`);
      analysisResult = getFallbackReport(corridorName);
    } else {
      try {
        const anthropic = new Anthropic({ apiKey });
        const systemPrompt = "You are a senior real estate investment analyst specializing in Hyderabad markets. Always respond ONLY with a clean JSON object. Do not include markdown formatting or explanations.";
        
        const userPrompt = `
          Provide a comprehensive investment analysis for the ${corridorName} corridor in Hyderabad.
          Data context:
          Appreciation history: ${JSON.stringify(appreciation.map(p => ({ year: p.year, price: p.pricePerSqFt, yoy: p.yoyChange })))}
          Demand trends (last 24 months): ${JSON.stringify(demand.map(d => ({ date: `${d.year}-${d.month}`, absorption: d.absorptionRate, search: d.searchVolume, inquiry: d.inquiryCount })))}
          Active infrastructure projects affecting zone: ${JSON.stringify(infra.map(i => ({ name: i.name, category: i.category, status: i.status, investment: i.totalInvestmentCr })))}
          Recent approvals (3 years): ${JSON.stringify(approvals.map(a => ({ name: a.projectName, type: a.approvalType, auth: a.authority, status: a.status })))}
          Intelligence score: ${intel?.overallScore || 70}/100

          Write a structured analysis in JSON:
          {
            "headline": "One compelling headline about this corridor",
            "investmentThesis": "3-4 sentence investment case",
            "nearTermCatalysts": ["catalyst1", "catalyst2", "catalyst3"],
            "longTermDrivers": ["driver1", "driver2"],
            "risks": ["risk1", "risk2"],
            "bestEntryWindow": "When to buy — e.g. 'Next 12-18 months before RRR completion'",
            "exitStrategy": "When and how to exit",
            "comparativeAdvantage": "vs other Hyderabad corridors",
            "targetInvestorProfile": "Who this corridor is best for",
            "priceOutlook": {
              "conservative": "X% over Y years",
              "base": "X% over Y years",
              "optimistic": "X% over Y years"
            }
          }
        `;

        const response = await anthropic.messages.create({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 1500,
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
        });

        const content = response.content[0].type === "text" ? response.content[0].text : "";
        const jsonStart = content.indexOf("{");
        const jsonEnd = content.lastIndexOf("}");
        if (jsonStart !== -1 && jsonEnd !== -1) {
          analysisResult = JSON.parse(content.substring(jsonStart, jsonEnd + 1));
        } else {
          throw new Error("Could not parse JSON from Claude response");
        }
      } catch (err) {
        console.error(`Failed to generate AI analysis from Claude for ${corridorName}:`, err);
        analysisResult = getFallbackReport(corridorName);
      }
    }

    // Write cache
    try {
      if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
      }
      fs.writeFileSync(cacheFile, JSON.stringify(analysisResult, null, 2), "utf-8");
    } catch (err) {
      console.error("Failed to write analysis cache file:", err);
    }

    return NextResponse.json({
      ...analysisResult,
      cached: false,
      generatedAt: new Date()
    });
  } catch (error: any) {
    console.error("Error in GET /api/market/corridors/[slug]/analysis:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}

// POST /api/market/corridors/[slug]/analysis - Force regenerate AI analysis (rate limited by cache deletion)
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const decodedSlug = decodeURIComponent(slug);

    const metric = await prisma.corridorProfile.findFirst({
      where: {
        OR: [
          { slug: { equals: decodedSlug, mode: "insensitive" } },
          { name: { equals: decodedSlug, mode: "insensitive" } },
          { shortName: { equals: decodedSlug, mode: "insensitive" } }
        ]
      }
    });

    if (!metric) {
      return NextResponse.json({ error: "Corridor not found" }, { status: 404 });
    }

    const corridorName = metric.slug;
    const cacheDir = path.join(process.cwd(), "src", "lib", "cache");
    const cacheFile = path.join(cacheDir, `corridor-analysis-${corridorName.replace(/\s+/g, "-").toLowerCase()}.json`);

    // Delete cache if exists to force regenerate
    if (fs.existsSync(cacheFile)) {
      // Check last modified to prevent spam (rate limit to once per hour/day, here we rate limit to once per hour for dev flexibility)
      const stats = fs.statSync(cacheFile);
      const ageMins = (Date.now() - stats.mtimeMs) / (1000 * 60);

      if (ageMins < 60) {
        return NextResponse.json({ 
          error: "Rate limit: Analysis can only be regenerated once per hour.",
          retryInMins: Math.ceil(60 - ageMins)
        }, { status: 429 });
      }

      fs.unlinkSync(cacheFile);
    }

    return NextResponse.json({ success: true, message: "Cache invalidated. Next GET will regenerate analysis." });
  } catch (error: any) {
    console.error("Error in POST /api/market/corridors/[slug]/analysis:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
