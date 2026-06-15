import "dotenv/config";
import { BuyerPersona, WATrigger, RiskLevel, InfraCategory, InfraStatus, MilestoneStatus, ApprovalType, ApprovalAuth, ApprovalStatus } from "@prisma/client";
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

  // ── SEEDING MARKET INTELLIGENCE DATA ────────────────────────────────────────

  console.log("Seeding InfraProjects and milestones...");
  await prisma.infraMilestone.deleteMany({});
  await prisma.infraProject.deleteMany({});

  const infraProjectsData = [
    {
      name: "Regional Ring Road — Northern Corridor",
      shortName: "RRR North",
      category: InfraCategory.ROAD_HIGHWAY,
      status: InfraStatus.UNDER_CONSTRUCTION,
      completionPct: 35,
      estimatedCompletion: "2027",
      totalInvestmentCr: 15627,
      expectedJobs: 50000,
      affectedCorridors: ["Shadnagar", "Sangareddy", "Yadadri", "Kompally"],
      impactRadius: 15,
      sourceGO: "G.O.Ms.No.68 MA&UD dt.12-03-2025",
      tags: ["NHAI", "Bharatmala", "HMDA"],
      reImpactScore: 10,
      milestones: [
        { title: "Land acquisition 94% complete", status: MilestoneStatus.COMPLETED },
        { title: "Construction begun — NH-44 stretch", status: MilestoneStatus.IN_PROGRESS },
        { title: "Full operational", date: new Date("2027-12-31"), status: MilestoneStatus.UPCOMING }
      ]
    },
    {
      name: "Regional Ring Road — Southern Corridor",
      shortName: "RRR South",
      category: InfraCategory.ROAD_HIGHWAY,
      status: InfraStatus.LAND_ACQUISITION,
      completionPct: 12,
      estimatedCompletion: "2029",
      totalInvestmentCr: 12000,
      expectedJobs: null,
      affectedCorridors: ["Shadnagar", "Shamshabad", "Adibatla"],
      impactRadius: 15,
      sourceGO: null,
      tags: ["NHAI", "HMDA"],
      reImpactScore: 9,
      milestones: [
        { title: "Environmental clearance pending", status: MilestoneStatus.IN_PROGRESS },
        { title: "Land acquisition in progress", status: MilestoneStatus.IN_PROGRESS },
        { title: "Construction start", date: new Date("2026-12-31"), status: MilestoneStatus.UPCOMING }
      ]
    },
    {
      name: "Hyderabad Pharma City (Green Pharma City)",
      shortName: "Pharma City",
      category: InfraCategory.PHARMA_BIOTECH,
      status: InfraStatus.PARTIALLY_COMPLETE,
      completionPct: 45,
      estimatedCompletion: "2026",
      totalInvestmentCr: 64000,
      expectedJobs: 560000,
      affectedCorridors: ["Pharma City", "Shadnagar", "Shamshabad"],
      impactRadius: 20,
      tags: ["TSIIC", "NIMZ", "GoT"],
      reImpactScore: 10,
      milestones: [
        { title: "150+ companies allotted land", status: MilestoneStatus.COMPLETED },
        { title: "Phase 1 internal roads complete", status: MilestoneStatus.COMPLETED },
        { title: "Dr Reddy's, Aurobindo operations begin", status: MilestoneStatus.IN_PROGRESS },
        { title: "Metro extension to Pharma City", date: new Date("2028-01-01"), status: MilestoneStatus.UPCOMING }
      ]
    },
    {
      name: "Outer Ring Road (ORR)",
      shortName: "ORR",
      category: InfraCategory.ROAD_HIGHWAY,
      status: InfraStatus.COMPLETE,
      completionPct: 100,
      estimatedCompletion: "Completed",
      totalInvestmentCr: null,
      expectedJobs: null,
      affectedCorridors: ["Kokapet", "Shamshabad", "Kompally", "Shadnagar", "Adibatla"],
      impactRadius: 10,
      tags: ["HMDA"],
      reImpactScore: 9,
      milestones: []
    },
    {
      name: "Hyderabad Metro Rail Phase 2 Extension",
      shortName: "Metro Phase 2",
      category: InfraCategory.METRO_RAIL,
      status: InfraStatus.APPROVED,
      completionPct: 8,
      estimatedCompletion: "2029",
      totalInvestmentCr: 24000,
      expectedJobs: null,
      affectedCorridors: ["Kokapet", "Shamshabad", "Sangareddy"],
      impactRadius: 5,
      tags: ["HMDA", "HMR"],
      reImpactScore: 8,
      milestones: []
    },
    {
      name: "Sangareddy Industrial Corridor (TSIIC)",
      shortName: "Sangareddy Industrial",
      category: InfraCategory.INDUSTRIAL_ZONE,
      status: InfraStatus.PARTIALLY_COMPLETE,
      completionPct: 60,
      estimatedCompletion: "2026",
      totalInvestmentCr: 8500,
      expectedJobs: 120000,
      affectedCorridors: ["Sangareddy"],
      impactRadius: 12,
      tags: ["TSIIC"],
      reImpactScore: 8,
      milestones: []
    },
    {
      name: "Batasingaram Logistics Park (HMDA PPP)",
      shortName: "Batasingaram Logistics",
      category: InfraCategory.LOGISTICS_PARK,
      status: InfraStatus.APPROVED,
      completionPct: 20,
      estimatedCompletion: "2026",
      totalInvestmentCr: null,
      expectedJobs: null,
      affectedCorridors: ["Adibatla", "Shamshabad"],
      impactRadius: 8,
      tags: ["HMDA"],
      reImpactScore: 7,
      milestones: []
    },
    {
      name: "RGIA Airport Terminal Expansion + Cargo Hub",
      shortName: "Airport Expansion",
      category: InfraCategory.AIRPORT_AVIATION,
      status: InfraStatus.UNDER_CONSTRUCTION,
      completionPct: 55,
      estimatedCompletion: "2026",
      totalInvestmentCr: 5000,
      expectedJobs: null,
      affectedCorridors: ["Shamshabad", "Shadnagar", "Adibatla"],
      impactRadius: 15,
      tags: ["GMR", "RGIA"],
      reImpactScore: 9,
      milestones: []
    },
    {
      name: "Genome Valley Bio-IT Park Expansion",
      shortName: "Genome Valley",
      category: InfraCategory.PHARMA_BIOTECH,
      status: InfraStatus.PARTIALLY_COMPLETE,
      completionPct: 70,
      estimatedCompletion: "2026",
      totalInvestmentCr: null,
      expectedJobs: null,
      affectedCorridors: ["Kompally"],
      impactRadius: 10,
      tags: ["TSIIC"],
      reImpactScore: 8,
      milestones: []
    },
    {
      name: "Adibatla Aerospace SEZ + Hardware Park",
      shortName: "Adibatla SEZ",
      category: InfraCategory.IT_TECH_PARK,
      status: InfraStatus.PARTIALLY_COMPLETE,
      completionPct: 55,
      estimatedCompletion: "2027",
      totalInvestmentCr: null,
      expectedJobs: null,
      affectedCorridors: ["Adibatla"],
      impactRadius: 8,
      tags: ["TSIIC"],
      reImpactScore: 9,
      milestones: []
    },
    {
      name: "Yadadri Temple Township Development",
      shortName: "Yadadri Township",
      category: InfraCategory.TOWNSHIP,
      status: InfraStatus.PARTIALLY_COMPLETE,
      completionPct: 65,
      estimatedCompletion: "2026",
      totalInvestmentCr: null,
      expectedJobs: null,
      affectedCorridors: ["Yadadri"],
      impactRadius: 20,
      tags: ["YTDA", "GoT"],
      reImpactScore: 7,
      milestones: []
    }
  ];

  for (const proj of infraProjectsData) {
    const { milestones, ...projFields } = proj;
    const createdProject = await prisma.infraProject.create({
      data: {
        ...projFields,
        description: `Official infrastructure project: ${projFields.name}. Designed to enhance connectivity and boost regional development.`,
        isPublished: true,
      }
    });

    if (milestones && milestones.length > 0) {
      for (const ms of milestones) {
        await prisma.infraMilestone.create({
          data: {
            ...ms,
            projectId: createdProject.id
          }
        });
      }
    }
  }

  console.log("Seeding AppreciationHistory...");
  await prisma.appreciationHistory.deleteMany({});

  const pricingData: Record<string, number[]> = {
    "Shadnagar": [1800, 2000, 2200, 2500, 2900, 3200, 3500, 3900],
    "Pharma City": [1600, 1800, 2000, 2350, 2700, 3100, 3600, 4100],
    "Kokapet": [4200, 4800, 5300, 6100, 7100, 8000, 8900, 9800],
    "Kompally": [2600, 2900, 3200, 3600, 4000, 4400, 4700, 5100],
    "Adibatla": [2100, 2400, 2700, 3100, 3500, 3900, 4300, 4800],
    "Shamshabad": [2200, 2450, 2700, 3050, 3400, 3800, 4150, 4550],
    "Yadadri": [1100, 1250, 1400, 1600, 1850, 2100, 2350, 2650],
    "Sangareddy": [1300, 1450, 1600, 1850, 2150, 2450, 2800, 3150]
  };

  const startYear = 2018;

  for (const [corridor, prices] of Object.entries(pricingData)) {
    for (let i = 0; i < prices.length; i++) {
      const year = startYear + i;
      const priceVal = prices[i];
      let yoy = 10.0;
      if (i > 0) {
        yoy = parseFloat((((priceVal - prices[i - 1]) / prices[i - 1]) * 100).toFixed(1));
      }

      await prisma.appreciationHistory.create({
        data: {
          corridor,
          year,
          pricePerSqFt: priceVal,
          yoyChange: yoy,
          source: "Market Research",
          notes: `Seeded pricing data for ${corridor} in ${year}`
        }
      });
    }
  }

  console.log("Seeding ApprovalRecords...");
  await prisma.approvalRecord.deleteMany({});

  const approvalRecordsData = [
    {
      projectName: "Aura Premium Plots",
      developerName: "Aura Developers",
      approvalType: ApprovalType.LAYOUT_APPROVAL,
      authority: ApprovalAuth.HMDA,
      approvalNumber: "LP-000456/2025/HMDA",
      approvalDate: new Date("2025-03-12"),
      corridor: "Shadnagar",
      areaAcres: 45.2,
      surveyNumbers: ["120", "121", "122"],
      status: ApprovalStatus.APPROVED,
      reraNumber: "P02400005678",
      reraUrl: "https://rera.telangana.gov.in",
      notes: "HMDA layout approved with 100% amenities completed."
    },
    {
      projectName: "Neopolis Tower A & B",
      developerName: "Prestige Group",
      approvalType: ApprovalType.RERA_REGISTRATION,
      authority: ApprovalAuth.RERA_TELANGANA,
      approvalNumber: "RERA-TS-2025-1234",
      approvalDate: new Date("2025-02-20"),
      corridor: "Kokapet",
      areaAcres: 12.5,
      surveyNumbers: ["88", "89"],
      status: ApprovalStatus.APPROVED,
      reraNumber: "P02400001234",
      reraUrl: "https://rera.telangana.gov.in",
      notes: "Commercial office towers and premium apartments registered."
    },
    {
      projectName: "Pharma City Township Phase 1",
      developerName: "TSIIC",
      approvalType: ApprovalType.TOWNSHIP_APPROVAL,
      authority: ApprovalAuth.TSIIC,
      approvalNumber: "TSIIC/PHARMA/2024",
      approvalDate: new Date("2024-11-05"),
      corridor: "Pharma City",
      areaAcres: 250.0,
      surveyNumbers: ["450", "451", "452", "453"],
      status: ApprovalStatus.APPROVED,
      notes: "Industrial township layout sanction."
    },
    {
      projectName: "Kompally Enclave",
      developerName: "SMR Holdings",
      approvalType: ApprovalType.BUILDING_PERMISSION,
      authority: ApprovalAuth.GHMC,
      approvalNumber: "BP-5678/GHMC/2025",
      approvalDate: new Date("2025-01-15"),
      corridor: "Kompally",
      areaAcres: 5.8,
      surveyNumbers: ["201", "202"],
      status: ApprovalStatus.APPROVED,
      notes: "G+12 Residential Apartment permissions."
    },
    {
      projectName: "Adibatla Smart Layout",
      developerName: "Aditya Construction",
      approvalType: ApprovalType.LAYOUT_APPROVAL,
      authority: ApprovalAuth.HMDA,
      approvalNumber: "LP-000890/2024/HMDA",
      approvalDate: new Date("2024-08-30"),
      corridor: "Adibatla",
      areaAcres: 28.4,
      surveyNumbers: ["90", "91", "92"],
      status: ApprovalStatus.APPROVED,
      notes: "Residential plotting layout."
    }
  ];

  for (const app of approvalRecordsData) {
    await prisma.approvalRecord.create({
      data: app
    });
  }

  console.log("Seeding DemandTrends...");
  await prisma.demandTrend.deleteMany({});

  const corridorsList = ["Shadnagar", "Pharma City", "Sangareddy", "Kokapet", "Shamshabad", "Yadadri", "Kompally", "Adibatla"];
  const startM = 6;
  const startY = 2024;
  
  for (const corridor of corridorsList) {
    for (let monthOffset = 0; monthOffset < 24; monthOffset++) {
      let m = startM + monthOffset;
      let y = startY;
      if (m > 12) {
        y += Math.floor((m - 1) / 12);
        m = ((m - 1) % 12) + 1;
      }

      const baseSearch = corridor === "Kokapet" ? 400 : corridor === "Pharma City" ? 350 : corridor === "Shadnagar" ? 300 : 150;
      const searchVolume = Math.round(baseSearch + Math.sin(monthOffset * 0.5) * 50 + Math.random() * 20);
      const inquiryCount = Math.round(searchVolume * 0.15 + Math.random() * 5);
      const siteVisits = Math.round(inquiryCount * 0.3 + Math.random() * 3);
      const newListings = Math.round(2 + Math.random() * 4);
      const inventoryUnits = Math.round(80 + Math.sin(monthOffset * 0.2) * 30 + Math.random() * 10);
      const soldUnits = Math.round(inventoryUnits * (0.1 + Math.random() * 0.1));
      const absorptionRate = parseFloat(((soldUnits / inventoryUnits) * 100).toFixed(1));
      const medianDaysOnMkt = Math.round(45 + Math.random() * 30);

      await prisma.demandTrend.create({
        data: {
          corridor,
          month: m,
          year: y,
          searchVolume,
          inquiryCount,
          siteVisits,
          newListings,
          inventoryUnits,
          soldUnits,
          absorptionRate,
          medianDaysOnMkt
        }
      });
    }
  }

  console.log("Seeding CorridorIntelligence...");
  await prisma.corridorIntelligence.deleteMany({});

  const initialIntelligence = [
    {
      corridor: "Shadnagar",
      overallScore: 78,
      infraScore: 20,
      approvalScore: 18,
      demandScore: 19,
      appreciationScore: 21,
      investorSentiment: "BULLISH",
      adminNote: "Shadnagar shows strong investment fundamentals driven by the upcoming RRR Southern Corridor and its strategic proximity to the Pharma City corridor. Extremely suitable for long-term land backing and plotting.",
      keyDrivers: ["Proximity to RRR Southern Corridor", "Affordable plotting rates under ₹4,000/sqft", "High search volume and inquiry growth"],
      keyRisks: ["Longer realization horizon for commercial infrastructure", "Potential localized pricing bubble in speculative zones"],
      bestFor: ["NRI_INVESTOR", "LAND_SPECULATOR"]
    },
    {
      corridor: "Pharma City",
      overallScore: 84,
      infraScore: 23,
      approvalScore: 19,
      demandScore: 20,
      appreciationScore: 22,
      investorSentiment: "BULLISH",
      adminNote: "Pharma City's greenfield industrial footprint is driving substantial worker housing demand. The nearby layout approvals confirm high developer commitment.",
      keyDrivers: ["World's largest pharma cluster development", "Upcoming metro network connectivity extension", "TSIIC direct layout sanctions"],
      keyRisks: ["Environmental clearance bottlenecks for industrial clusters", "Delay in metro phase 2 execution"],
      bestFor: ["LAND_SPECULATOR", "HNI_PORTFOLIO_BUILDER"]
    },
    {
      corridor: "Kokapet",
      overallScore: 88,
      infraScore: 22,
      approvalScore: 22,
      demandScore: 22,
      appreciationScore: 22,
      investorSentiment: "BULLISH",
      adminNote: "West Hyderabad's luxury commercial crown jewel. Kokapet is witnessing premium corporate developments and Neopolis infrastructure, making it highly liquid.",
      keyDrivers: ["Neopolis IT SEZ commercial expansion", "ORR Junction Exit 1 connectivity", "Premium residential and luxury corporate demands"],
      keyRisks: ["Very high entry ticket cost", "Intense competition among high-rise developers"],
      bestFor: ["NRI_INVESTOR", "HNI_PORTFOLIO_BUILDER"]
    },
    {
      corridor: "Kompally",
      overallScore: 72,
      infraScore: 17,
      approvalScore: 18,
      demandScore: 18,
      appreciationScore: 19,
      investorSentiment: "NEUTRAL",
      adminNote: "A stable residential hub in North Hyderabad with excellent lifestyle amenities. Ideal for professional first homes and low-risk capital growth.",
      keyDrivers: ["Mature social infrastructure (schools, parks)", "Flyover expansion mitigating traffic on NH-44", "Steady residential demand and rentals"],
      keyRisks: ["Moderate capital appreciation rates", "High density construction leading to groundwater stress"],
      bestFor: ["FIRST_TIME_BUYER", "PROFESSIONAL_FIRST_HOME"]
    },
    {
      corridor: "Adibatla",
      overallScore: 79,
      infraScore: 21,
      approvalScore: 18,
      demandScore: 19,
      appreciationScore: 21,
      investorSentiment: "BULLISH",
      adminNote: "Driven by TCS and the aerospace SEZ, Adibatla remains a highly preferred destination for IT professionals. Rental yields are higher than average.",
      keyDrivers: ["TCS Campus and Aerospace SEZ active workforce", "Direct Outer Ring Road Exit 12 access", "Strong demand for premium gated community villas"],
      keyRisks: ["Dependence on IT hiring trends", "Slow development of public transport link extensions"],
      bestFor: ["NRI_INVESTOR", "PROFESSIONAL_FIRST_HOME"]
    },
    {
      corridor: "Shamshabad",
      overallScore: 74,
      infraScore: 20,
      approvalScore: 17,
      demandScore: 18,
      appreciationScore: 19,
      investorSentiment: "NEUTRAL",
      adminNote: "Shamshabad is anchored by the international airport and associated logistics hubs. The expansion of airport terminals supports capital appreciation.",
      keyDrivers: ["RGIA airport terminal & cargo expansion", "High rental demand from airport workforce", "Excellent connectivity via ORR"],
      keyRisks: ["Regulatory height limitations near flight paths", "Higher land acquisition costs in core aviation zones"],
      bestFor: ["HNI_PORTFOLIO_BUILDER", "RETIREMENT_PLANNER"]
    },
    {
      corridor: "Yadadri",
      overallScore: 62,
      infraScore: 15,
      approvalScore: 15,
      demandScore: 14,
      appreciationScore: 18,
      investorSentiment: "CAUTIOUS",
      adminNote: "Speculative plotting zone centered around temple tourism and local infrastructure. Suitable only for high-risk capital growth with a long horizon.",
      keyDrivers: ["Temple tourism development driving local footprint", "Affordable entry price for budget investors", "Warangal Highway link expansions"],
      keyRisks: ["High volatility in plot pricing", "Slower infrastructural development in core layout rings"],
      bestFor: ["FIRST_TIME_BUYER", "LAND_SPECULATOR"]
    },
    {
      corridor: "Sangareddy",
      overallScore: 71,
      infraScore: 18,
      approvalScore: 17,
      demandScore: 17,
      appreciationScore: 19,
      investorSentiment: "NEUTRAL",
      adminNote: "Industrial belt expansion with a steady influx of manufacturing workforce. Offers low entry cost plotting options with moderate capital growth.",
      keyDrivers: ["TSIIC industrial parks and manufacturing zones", "RRR Northern Corridor connectivity impact", "Good link to Mumbai highway (NH-65)"],
      keyRisks: ["Heavy industrial pollution in immediate surroundings", "Slower urban lifestyle infrastructure maturity"],
      bestFor: ["FIRST_TIME_BUYER", "RETIREMENT_PLANNER"]
    }
  ];

  for (const ci of initialIntelligence) {
    await prisma.corridorIntelligence.upsert({
      where: { corridor: ci.corridor },
      update: ci,
      create: ci
    });
  }

  // 4. Run classification, scoring, and matching for all leads
  console.log("Running persona classification, lead scoring, and smart matching for all leads...");
  const leads = await prisma.lead.findMany({ select: { id: true } });
  
  const { classifyLeadPersona } = await import("../src/lib/persona-engine");
  const { calculateLeadScore } = await import("../src/lib/lead-scorer");
  const { runAllMatching } = await import("../src/lib/matching-engine");

  for (const lead of leads) {
    try {
      await classifyLeadPersona(lead.id);
      await calculateLeadScore(lead.id);
    } catch (e) {
      console.error(`Failed to classify/score lead ${lead.id}:`, e);
    }
  }

  try {
    await runAllMatching();
  } catch (e) {
    console.error("Failed to run matching engine:", e);
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
