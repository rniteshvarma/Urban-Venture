import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

const projectsData = [
  {
    name: "Elite Green Meadows",
    developer: "Aura Developers",
    corridor: "Shadnagar Corridor",
    city: "Hyderabad",
    minBudgetLakhs: 18.0,
    maxBudgetLakhs: 35.0,
    minHorizonYears: 3,
    maxHorizonYears: 7,
    riskLevel: "MEDIUM" as const,
    propertyType: "Plots",
    infraHighlights: ["Regional Ring Road (RRR)", "MMTS Phase 2 Extension", "NH-44 Proximity"],
    exitOpportunities: ["Resale to developers", "Individual villa construction", "Long-term land banking"],
    comparables: ["Suvarnabhoomi Infra", "Siri Sampada", "Building Blocks Group"],
    description: "Elite Green Meadows is a premium open plot development located along the booming Shadnagar corridor. Highly suited for mid-to-long term appreciation due to the upcoming Regional Ring Road.",
    brochureUrl: "",
    imageUrls: ["/projects/shadnagar-1.jpg"],
    status: "ACTIVE" as const,
  },
  {
    name: "Pharma City Valley",
    developer: "Vertex Group",
    corridor: "Pharma City Influence Zone",
    city: "Hyderabad",
    minBudgetLakhs: 32.0,
    maxBudgetLakhs: 75.0,
    minHorizonYears: 5,
    maxHorizonYears: 10,
    riskLevel: "MEDIUM" as const,
    propertyType: "Plots",
    infraHighlights: ["Hyderabad Pharma City SEZ", "ORR Exit 14 Connection", "Proposed Metro Link"],
    exitOpportunities: ["Commercial rental yield", "Resale to pharma employees", "Plot subdivision"],
    comparables: ["Elite Pharma Hills", "Apex Green County"],
    description: "An expansive gated plot community located close to the Hyderabad Pharma City entry gates, targeting high appreciation driven by the industrial hub employment boom.",
    brochureUrl: "",
    imageUrls: ["/projects/pharmacity-1.jpg"],
    status: "ACTIVE" as const,
  },
  {
    name: "Sangareddy Heights",
    developer: "True Space Projects",
    corridor: "Sangareddy Industrial Belt",
    city: "Hyderabad",
    minBudgetLakhs: 22.0,
    maxBudgetLakhs: 55.0,
    minHorizonYears: 3,
    maxHorizonYears: 7,
    riskLevel: "MEDIUM" as const,
    propertyType: "Residential",
    infraHighlights: ["IIT Hyderabad Hub", "Mumbai Highway NH-65", "Sangareddy Collectorate Link"],
    exitOpportunities: ["Resale to IIT staff/students", "Long term rental", "Sublease"],
    comparables: ["IIT Residency", "Sangareddy Greens"],
    description: "Affordable premium residential apartment complex with modern amenities catering to professionals working in the nearby industrial parks and IIT Hyderabad campus.",
    brochureUrl: "",
    imageUrls: ["/projects/sangareddy-1.jpg"],
    status: "ACTIVE" as const,
  },
  {
    name: "Aura One Kokapet",
    developer: "Prestige Group",
    corridor: "Kokapet / Financial District Extension",
    city: "Hyderabad",
    minBudgetLakhs: 90.0,
    maxBudgetLakhs: 200.0,
    minHorizonYears: 2,
    maxHorizonYears: 5,
    riskLevel: "LOW" as const,
    propertyType: "Villa",
    infraHighlights: ["Neopolis IT SEZ", "ORR Exit 1", "Trumpet Expressway"],
    exitOpportunities: ["High rental yield from IT Executives", "Resale in secondary luxury market", "Premium corporate lease"],
    comparables: ["My Home Avatar", "Rajapushpa Regalia"],
    description: "Ultra-luxury high-rise residences with panoramic views of Kokapet Neopolis. Perfectly positioned for immediate appreciation and high-profile corporate tenants.",
    brochureUrl: "",
    imageUrls: ["/projects/kokapet-1.jpg"],
    status: "ACTIVE" as const,
  },
  {
    name: "Aerotropolis Enclave",
    developer: "GMR Infra Projects",
    corridor: "Shamshabad / Aerospace SEZ",
    city: "Hyderabad",
    minBudgetLakhs: 28.0,
    maxBudgetLakhs: 68.0,
    minHorizonYears: 3,
    maxHorizonYears: 7,
    riskLevel: "MEDIUM" as const,
    propertyType: "Plots",
    infraHighlights: ["RGIA Airport Expansion", "Aerospace & Defence SEZ", "Srisailam Highway Connect"],
    exitOpportunities: ["Resale to airport expansion staff", "Build & lease commercial space", "Capital appreciation exit"],
    comparables: ["GMR Airport City", "Srisailam County"],
    description: "Gated community plots adjacent to the Shamshabad Airport Zone, ideal for smart investors targeting high growth in aerospace and logistics sectors.",
    brochureUrl: "",
    imageUrls: ["/projects/shamshabad-1.jpg"],
    status: "ACTIVE" as const,
  },
  {
    name: "Temple Town Vista",
    developer: "Sri Lakshmi Developers",
    corridor: "Yadadri / Outer Ring Road East",
    city: "Hyderabad",
    minBudgetLakhs: 16.0,
    maxBudgetLakhs: 32.0,
    minHorizonYears: 5,
    maxHorizonYears: 10,
    riskLevel: "HIGH" as const,
    propertyType: "Plots",
    infraHighlights: ["Yadadri Temple Development", "Warangal Highway NH-163", "Proposed Metro Corridor"],
    exitOpportunities: ["Second home/retirement villa sale", "Pilgrimage lodging rentals", "Long term plot resale"],
    comparables: ["Yadadri Hills", "Sri Rama Township"],
    description: "Budget-friendly plotting project situated in the booming tourism and pilgrimage hub of Yadadri. Excellent long-term capital appreciation play.",
    brochureUrl: "",
    imageUrls: ["/projects/yadadri-1.jpg"],
    status: "ACTIVE" as const,
  },
  {
    name: "Kompally Elite Villas",
    developer: "Modi Properties",
    corridor: "Kompally / NH44 Corridor",
    city: "Hyderabad",
    minBudgetLakhs: 45.0,
    maxBudgetLakhs: 110.0,
    minHorizonYears: 1,
    maxHorizonYears: 5,
    riskLevel: "LOW" as const,
    propertyType: "Villa",
    infraHighlights: ["Kompally Junction Expansion", "Gundlapochampally MMTS", "NH-44 Bypass Line"],
    exitOpportunities: ["High resale to families", "Rental to local doctors/executives", "Ready to move villa lease"],
    comparables: ["Kompally Meadows", "Aparna Serene"],
    description: "Exclusive gated villa project in Kompally, boasting green landscapes, excellent school connectivity, and active metro-commute options.",
    brochureUrl: "",
    imageUrls: ["/projects/kompally-1.jpg"],
    status: "ACTIVE" as const,
  },
  {
    name: "Adibatla Tech Valley",
    developer: "TCS Builders",
    corridor: "Adibatla IT Corridor",
    city: "Hyderabad",
    minBudgetLakhs: 55.0,
    maxBudgetLakhs: 140.0,
    minHorizonYears: 2,
    maxHorizonYears: 5,
    riskLevel: "MEDIUM" as const,
    propertyType: "Residential",
    infraHighlights: ["Tata Aerospace SEZ", "TCS Adibatla Campus", "Outer Ring Road Exit 12"],
    exitOpportunities: ["Rentals to TCS/Tata engineers", "Ready resale in active IT pocket", "Premium apartment resale"],
    comparables: ["Adibatla Heights", "Tata Enclave"],
    description: "Modern residential community designed for IT professionals working at TCS and Tata Aerospace SEZ. Premium features with a compact, easy-maintenance luxury styling.",
    brochureUrl: "",
    imageUrls: ["/projects/adibatla-1.jpg"],
    status: "ACTIVE" as const,
  }
];

const corridorsData = [
  {
    corridor: "Shadnagar",
    city: "Hyderabad",
    historicalCAGR: 14.2,
    projectedCAGRMin: 11.0,
    projectedCAGRMax: 18.0,
    rentalYieldMin: 3.5,
    rentalYieldMax: 5.0,
    infraScore: 7,
    demandScore: 8,
    riskLevel: "MEDIUM" as const
  },
  {
    corridor: "Pharma City",
    city: "Hyderabad",
    historicalCAGR: 16.8,
    projectedCAGRMin: 13.0,
    projectedCAGRMax: 22.0,
    rentalYieldMin: 4.0,
    rentalYieldMax: 6.0,
    infraScore: 8,
    demandScore: 9,
    riskLevel: "MEDIUM" as const
  },
  {
    corridor: "Sangareddy",
    city: "Hyderabad",
    historicalCAGR: 13.1,
    projectedCAGRMin: 10.0,
    projectedCAGRMax: 17.0,
    rentalYieldMin: 3.0,
    rentalYieldMax: 4.5,
    infraScore: 6,
    demandScore: 7,
    riskLevel: "MEDIUM" as const
  },
  {
    corridor: "Kokapet",
    city: "Hyderabad",
    historicalCAGR: 18.5,
    projectedCAGRMin: 12.0,
    projectedCAGRMax: 20.0,
    rentalYieldMin: 5.0,
    rentalYieldMax: 7.0,
    infraScore: 9,
    demandScore: 9,
    riskLevel: "LOW" as const
  },
  {
    corridor: "Shamshabad",
    city: "Hyderabad",
    historicalCAGR: 12.4,
    projectedCAGRMin: 9.0,
    projectedCAGRMax: 15.0,
    rentalYieldMin: 3.5,
    rentalYieldMax: 5.5,
    infraScore: 7,
    demandScore: 7,
    riskLevel: "MEDIUM" as const
  },
  {
    corridor: "Yadadri",
    city: "Hyderabad",
    historicalCAGR: 11.2,
    projectedCAGRMin: 8.0,
    projectedCAGRMax: 14.0,
    rentalYieldMin: 2.5,
    rentalYieldMax: 4.0,
    infraScore: 5,
    demandScore: 6,
    riskLevel: "HIGH" as const
  },
  {
    corridor: "Kompally",
    city: "Hyderabad",
    historicalCAGR: 13.8,
    projectedCAGRMin: 10.0,
    projectedCAGRMax: 16.0,
    rentalYieldMin: 4.0,
    rentalYieldMax: 5.5,
    infraScore: 7,
    demandScore: 8,
    riskLevel: "LOW" as const
  },
  {
    corridor: "Adibatla",
    city: "Hyderabad",
    historicalCAGR: 15.3,
    projectedCAGRMin: 11.0,
    projectedCAGRMax: 19.0,
    rentalYieldMin: 4.5,
    rentalYieldMax: 6.5,
    infraScore: 8,
    demandScore: 8,
    riskLevel: "MEDIUM" as const
  }
];

const personasData = [
  {
    persona: "FIRST_TIME_BUYER" as const,
    displayName: "First-Time Buyer",
    description: "First home or small investment, budget-conscious",
    minBudgetLakhs: 0,
    maxBudgetLakhs: 30,
    minHorizon: 3,
    maxHorizon: 5,
    riskLevels: ["MEDIUM" as const],
    color: "#3B82F6",
    icon: "🏠",
    defaultProjects: []
  },
  {
    persona: "NRI_INVESTOR" as const,
    displayName: "NRI Investor",
    description: "Long-term investment, premium properties",
    minBudgetLakhs: 50,
    maxBudgetLakhs: null,
    minHorizon: 5,
    maxHorizon: 10,
    riskLevels: ["LOW" as const, "MEDIUM" as const],
    color: "#8B5CF6",
    icon: "✈️",
    defaultProjects: []
  },
  {
    persona: "LAND_SPECULATOR" as const,
    displayName: "Land Speculator",
    description: "Short-term capital gains, high appreciation focus",
    minBudgetLakhs: null,
    maxBudgetLakhs: null,
    minHorizon: 1,
    maxHorizon: 3,
    riskLevels: ["HIGH" as const],
    color: "#EF4444",
    icon: "📈",
    defaultProjects: []
  },
  {
    persona: "RETIREMENT_PLANNER" as const,
    displayName: "Retirement Planner",
    description: "Stable, low-risk capital preservation",
    minBudgetLakhs: 20,
    maxBudgetLakhs: 60,
    minHorizon: 7,
    maxHorizon: 10,
    riskLevels: ["LOW" as const],
    color: "#10B981",
    icon: "👴",
    defaultProjects: []
  },
  {
    persona: "HNI_PORTFOLIO_BUILDER" as const,
    displayName: "HNI Portfolio Builder",
    description: "UHNW multi-property diversification",
    minBudgetLakhs: 100,
    maxBudgetLakhs: null,
    minHorizon: 3,
    maxHorizon: 10,
    riskLevels: ["LOW" as const, "MEDIUM" as const, "HIGH" as const],
    color: "#F59E0B",
    icon: "💼",
    defaultProjects: []
  },
  {
    persona: "PROFESSIONAL_FIRST_HOME" as const,
    displayName: "Professional First Home",
    description: "Salaried professional homebuyer",
    minBudgetLakhs: 30,
    maxBudgetLakhs: 80,
    minHorizon: 3,
    maxHorizon: 7,
    riskLevels: ["LOW" as const],
    color: "#06B6D4",
    icon: "💻",
    defaultProjects: []
  }
];

const templatesData = [
  {
    name: "Lead Captured Welcome",
    trigger: "LEAD_CREATED" as const,
    message: "Hello {{lead_name}}! 👋 Thank you for exploring investment opportunities with us. Based on your interest in {{city}}, we've prepared personalized corridor recommendations for a ₹{{budget}}L investment. Your AI report is ready — our advisor will reach out within 24 hours. Meanwhile, feel free to explore more at {{portal_url}}"
  },
  {
    name: "Site Visit Reminder",
    trigger: "SITE_VISIT_REMINDER" as const,
    message: "Hello {{lead_name}}! This is a reminder that your site visit to {{project_name}} in {{corridor}} is scheduled for {{visit_date}} at {{visit_time}}. 📍 Location: {{project_address}}. Please confirm by replying YES. Contact your advisor {{agent_name}} at {{agent_phone}} for any changes."
  },
  {
    name: "Site Visit Feedback",
    trigger: "SITE_VISIT_FOLLOWUP" as const,
    message: "Hello {{lead_name}}, we hope you enjoyed your visit to {{project_name}}! 🏗️ Do you have any questions about the project or payment plans? Our advisor {{agent_name}} is available to help. We'd love to know your thoughts — just reply to this message."
  },
  {
    name: "Proposal Dispatched",
    trigger: "PROPOSAL_SENT" as const,
    message: "Hello {{lead_name}}, your personalized investment proposal for {{project_name}} (₹{{project_price}}L) has been sent to {{email}}. 📄 The proposal includes detailed payment schedules, legal documentation checklist, and ROI projections. Please review and let us know your questions."
  },
  {
    name: "Stale Engagement - 7 Days",
    trigger: "STAGE_INITIAL_CONTACT" as const,
    message: "Hello {{lead_name}}! 👋 We noticed you explored {{corridor}} corridor investment options recently. The market in this area has been active — new projects have been added matching your ₹{{budget}}L budget. Would you like to see the latest options? Reply YES and we'll share them."
  },
  {
    name: "Project Match Alert",
    trigger: "PROJECT_MATCH_FOUND" as const,
    message: "Hello {{lead_name}}! 🎯 Great news — we've found a new project that matches your investment profile perfectly. {{project_name}} in {{corridor}} is available at ₹{{project_price}}L with an expected appreciation of {{appreciation_range}} over {{horizon}} years. Shall we schedule a quick call?"
  }
];

export async function GET() {
  try {
    console.log("🧹 Database cleanup started...");
    await prisma.actionItem.deleteMany();
    await prisma.roadmapStage.deleteMany();
    await prisma.leadRoadmap.deleteMany();
    await prisma.projectLeadMatch.deleteMany();
    await prisma.whatsAppLog.deleteMany();
    await prisma.lead.deleteMany();
    await prisma.search.deleteMany();
    await prisma.project.deleteMany();
    await prisma.user.deleteMany();
    await prisma.personaConfig.deleteMany();
    await prisma.corridorMetrics.deleteMany();
    await prisma.whatsAppTemplate.deleteMany();
    console.log("🧹 Cleanup successful!");

    console.log("👤 Seeding Admin credentials...");
    const hashedPassword = await bcrypt.hash("12345678", 10);
    const adminUser = await prisma.user.create({
      data: {
        email: "uv@gmail.com",
        name: "Urban Ventures Admin",
        phone: "+919999999999",
        password: hashedPassword,
        role: "ADMIN"
      }
    });

    console.log("🏢 Seeding Projects...");
    const dbProjects: any[] = [];
    for (const p of projectsData) {
      const dbProj = await prisma.project.create({
        data: p
      });
      dbProjects.push(dbProj);
    }

    console.log("📈 Seeding Corridor Metrics...");
    for (const c of corridorsData) {
      await prisma.corridorMetrics.create({
        data: c
      });
    }

    console.log("🏷️ Seeding WhatsApp Templates...");
    for (const t of templatesData) {
      await prisma.whatsAppTemplate.create({
        data: t
      });
    }

    console.log("🎭 Seeding Personas & mapping projects...");
    for (const p of personasData) {
      const matchingProjIds = dbProjects.filter(dp => {
        const budgetMatch = (p.minBudgetLakhs === null || dp.minBudgetLakhs >= p.minBudgetLakhs) &&
                           (p.maxBudgetLakhs === null || dp.maxBudgetLakhs <= p.maxBudgetLakhs);
        const riskMatch = (p.riskLevels as any[]).includes(dp.riskLevel);
        return budgetMatch && riskMatch;
      }).map(dp => dp.id);

      await prisma.personaConfig.create({
        data: {
          ...p,
          defaultProjects: matchingProjIds
        }
      });
    }

    console.log("🎉 Seeding completed successfully!");
    return NextResponse.json({ 
      success: true, 
      message: "Production database successfully cleaned, seeded with admin (uv@gmail.com / 12345678), projects, corridors, persona rules, and templates!"
    });
  } catch (error: any) {
    console.error("Temp seed error:", error);
    return NextResponse.json({ error: "Database seeding failed", details: error.message }, { status: 500 });
  }
}
