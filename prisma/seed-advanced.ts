import "dotenv/config";
import { BuyerPersona, WATrigger, RiskLevel } from "@prisma/client";
import prisma from "../src/lib/prisma";

async function main() {
  console.log("Seeding advanced features database tables...");

  // 1. Seed PersonaConfig
  console.log("Seeding PersonaConfig...");
  const personas = [
    {
      persona: BuyerPersona.FIRST_TIME_BUYER,
      displayName: "First-Time Buyer",
      description: "First home or small investment, budget-conscious",
      minBudgetLakhs: 0,
      maxBudgetLakhs: 30,
      minHorizon: 3,
      maxHorizon: 5,
      riskLevels: [RiskLevel.MEDIUM],
      color: "#3B82F6",
      icon: "🏠",
      defaultProjects: []
    },
    {
      persona: BuyerPersona.NRI_INVESTOR,
      displayName: "NRI Investor",
      description: "Long-term investment, premium properties",
      minBudgetLakhs: 50,
      maxBudgetLakhs: null,
      minHorizon: 5,
      maxHorizon: 10,
      riskLevels: [RiskLevel.LOW, RiskLevel.MEDIUM],
      color: "#8B5CF6",
      icon: "✈️",
      defaultProjects: []
    },
    {
      persona: BuyerPersona.LAND_SPECULATOR,
      displayName: "Land Speculator",
      description: "Short-term capital gains, high appreciation focus",
      minBudgetLakhs: null,
      maxBudgetLakhs: null,
      minHorizon: 1,
      maxHorizon: 3,
      riskLevels: [RiskLevel.HIGH],
      color: "#EF4444",
      icon: "📈",
      defaultProjects: []
    },
    {
      persona: BuyerPersona.RETIREMENT_PLANNER,
      displayName: "Retirement Planner",
      description: "Stable, low-risk capital preservation",
      minBudgetLakhs: 20,
      maxBudgetLakhs: 60,
      minHorizon: 7,
      maxHorizon: 10,
      riskLevels: [RiskLevel.LOW],
      color: "#10B981",
      icon: "👴",
      defaultProjects: []
    },
    {
      persona: BuyerPersona.HNI_PORTFOLIO_BUILDER,
      displayName: "HNI Portfolio Builder",
      description: "UHNW multi-property diversification",
      minBudgetLakhs: 100,
      maxBudgetLakhs: null,
      minHorizon: 3,
      maxHorizon: 10,
      riskLevels: [RiskLevel.LOW, RiskLevel.MEDIUM, RiskLevel.HIGH],
      color: "#F59E0B",
      icon: "💼",
      defaultProjects: []
    },
    {
      persona: BuyerPersona.PROFESSIONAL_FIRST_HOME,
      displayName: "Professional First Home",
      description: "Salaried professional homebuyer",
      minBudgetLakhs: 30,
      maxBudgetLakhs: 80,
      minHorizon: 3,
      maxHorizon: 7,
      riskLevels: [RiskLevel.LOW],
      color: "#06B6D4",
      icon: "💻",
      defaultProjects: []
    }
  ];

  // Map database project ids to default projects for personas dynamically
  const dbProjects = await prisma.project.findMany();

  for (const p of personas) {
    // Basic filter logic to link projects to personas on seed
    const matchingProjIds = dbProjects.filter(dp => {
      // Check budget
      const budgetMatch = (p.minBudgetLakhs === null || dp.minBudgetLakhs >= p.minBudgetLakhs) &&
                         (p.maxBudgetLakhs === null || dp.maxBudgetLakhs <= p.maxBudgetLakhs);
      // Check risk
      const riskMatch = (p.riskLevels as any[]).includes(dp.riskLevel);
      return budgetMatch && riskMatch;
    }).map(dp => dp.id);

    p.defaultProjects = matchingProjIds as any;

    await prisma.personaConfig.upsert({
      where: { persona: p.persona },
      update: {
        displayName: p.displayName,
        description: p.description,
        minBudgetLakhs: p.minBudgetLakhs,
        maxBudgetLakhs: p.maxBudgetLakhs,
        minHorizon: p.minHorizon,
        maxHorizon: p.maxHorizon,
        riskLevels: p.riskLevels,
        color: p.color,
        icon: p.icon,
        defaultProjects: p.defaultProjects
      },
      create: p
    });
  }

  // 2. Seed CorridorMetrics
  console.log("Seeding CorridorMetrics...");
  const corridors = [
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
      riskLevel: RiskLevel.MEDIUM
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
      riskLevel: RiskLevel.MEDIUM
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
      riskLevel: RiskLevel.MEDIUM
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
      riskLevel: RiskLevel.LOW
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
      riskLevel: RiskLevel.MEDIUM
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
      riskLevel: RiskLevel.HIGH
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
      riskLevel: RiskLevel.LOW
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
      riskLevel: RiskLevel.MEDIUM
    }
  ];

  for (const c of corridors) {
    await prisma.corridorMetrics.upsert({
      where: { corridor: c.corridor },
      update: c,
      create: c
    });
  }

  // 3. Seed WhatsAppTemplate
  console.log("Seeding WhatsAppTemplates...");
  const templates = [
    {
      name: "Lead Captured Welcome",
      trigger: WATrigger.LEAD_CREATED,
      message: "Hello {{lead_name}}! 👋 Thank you for exploring investment opportunities with us. Based on your interest in {{city}}, we've prepared personalized corridor recommendations for a ₹{{budget}}L investment. Your AI report is ready — our advisor will reach out within 24 hours. Meanwhile, feel free to explore more at {{portal_url}}"
    },
    {
      name: "Site Visit Reminder",
      trigger: WATrigger.SITE_VISIT_REMINDER,
      message: "Hello {{lead_name}}! This is a reminder that your site visit to {{project_name}} in {{corridor}} is scheduled for {{visit_date}} at {{visit_time}}. 📍 Location: {{project_address}}. Please confirm by replying YES. Contact your advisor {{agent_name}} at {{agent_phone}} for any changes."
    },
    {
      name: "Site Visit Feedback",
      trigger: WATrigger.SITE_VISIT_FOLLOWUP,
      message: "Hello {{lead_name}}, we hope you enjoyed your visit to {{project_name}}! 🏗️ Do you have any questions about the project or payment plans? Our advisor {{agent_name}} is available to help. We'd love to know your thoughts — just reply to this message."
    },
    {
      name: "Proposal Dispatched",
      trigger: WATrigger.PROPOSAL_SENT,
      message: "Hello {{lead_name}}, your personalized investment proposal for {{project_name}} (₹{{project_price}}L) has been sent to {{email}}. 📄 The proposal includes detailed payment schedules, legal documentation checklist, and ROI projections. Please review and let us know your questions."
    },
    {
      name: "Stale Engagement - 7 Days",
      trigger: WATrigger.STAGE_INITIAL_CONTACT, // using STAGE_INITIAL_CONTACT or trigger mapping
      message: "Hello {{lead_name}}! 👋 We noticed you explored {{corridor}} corridor investment options recently. The market in this area has been active — new projects have been added matching your ₹{{budget}}L budget. Would you like to see the latest options? Reply YES and we'll share them."
    },
    {
      name: "Project Match Alert",
      trigger: WATrigger.PROJECT_MATCH_FOUND,
      message: "Hello {{lead_name}}! 🎯 Great news — we've found a new project that matches your investment profile perfectly. {{project_name}} in {{corridor}} is available at ₹{{project_price}}L with an expected appreciation of {{appreciation_range}} over {{horizon}} years. Shall we schedule a quick call?"
    }
  ];

  // We map trigger names to upsert templates cleanly
  for (const t of templates) {
    await prisma.whatsAppTemplate.upsert({
      where: { name: t.name },
      update: {
        trigger: t.trigger,
        message: t.message
      },
      create: t
    });
  }

  console.log("Advanced features seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("Error during advanced seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
