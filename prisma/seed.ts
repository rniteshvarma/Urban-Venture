import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import bcrypt from 'bcryptjs';

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

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }

  const useSsl = connectionString.includes('sslmode=') || 
                 connectionString.includes('.postgres.database.azure.com') ||
                 connectionString.includes('supabase') || 
                 connectionString.includes('neon.tech') ||
                 (process.env.NODE_ENV === 'production' && !connectionString.includes('localhost') && !connectionString.includes('127.0.0.1'));

  let cleanDbUrl = connectionString;
  if (useSsl) {
    try {
      const parsedUrl = new URL(connectionString);
      parsedUrl.searchParams.delete('sslmode');
      cleanDbUrl = parsedUrl.toString();
    } catch (e) {
      cleanDbUrl = connectionString.replace(/[\?&]sslmode=[^&]+/g, '');
      if (cleanDbUrl.endsWith('?') || cleanDbUrl.endsWith('&')) {
        cleanDbUrl = cleanDbUrl.slice(0, -1);
      }
    }
  }

  const poolConfig: any = { connectionString: cleanDbUrl };
  if (useSsl) {
    poolConfig.ssl = { rejectUnauthorized: false };
  }

  console.log("Initializing database connection...");
  const pool = new pg.Pool(poolConfig);
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    console.log("Cleaning up database...");
    await prisma.actionItem.deleteMany();
    await prisma.roadmapStage.deleteMany();
    await prisma.leadRoadmap.deleteMany();
    await prisma.projectLeadMatch.deleteMany();
    await prisma.whatsAppLog.deleteMany();
    await prisma.lead.deleteMany();
    await prisma.search.deleteMany();
    await prisma.project.deleteMany();
    await prisma.user.deleteMany();

    console.log("Seeding Admin users...");
    const hashedPass1 = await bcrypt.hash("12345678", 10);
    const hashedPass2 = await bcrypt.hash("Admin@123", 10);
    const adminAccounts = [
      { email: "uv@gmail.com", name: "Property Tiger Admin", phone: "+919999999999", password: hashedPass1, role: "ADMIN" as const },
      { email: "admin@realestate.com", name: "Real Estate Admin", phone: "+919999999998", password: hashedPass2, role: "ADMIN" as const },
      { email: "admin@propertytiger.com", name: "Property Tiger Admin", phone: "+919999999997", password: hashedPass1, role: "ADMIN" as const },
    ];
    for (const acc of adminAccounts) {
      await prisma.user.upsert({
        where: { email: acc.email },
        update: acc,
        create: acc,
      });
      console.log("Admin user ready:", acc.email);
    }

    console.log("Seeding projects...");
    for (const project of projectsData) {
      const createdProject = await prisma.project.create({
        data: project
      });
      console.log(`Created project: ${createdProject.name} in ${createdProject.corridor}`);
    }

    console.log("Seeding Inbound Sources...");
    const inboundSources = [
      {
        name: "99acres",
        type: "PORTAL_WEBHOOK" as const,
        webhookToken: "99acres-token-uv-2026",
        fieldMapping: {
          name: "name",
          mobile: "phone",
          email: "email",
          message: "message",
          property_id: "propertyId",
          property_name: "propertyName",
          budget: "budget"
        },
        defaultStatus: "NEW" as const,
        dedupeWindow: 24,
        isActive: true,
      },
      {
        name: "MagicBricks",
        type: "PORTAL_WEBHOOK" as const,
        webhookToken: "magicbricks-token-uv-2026",
        fieldMapping: {
          sender_name: "name",
          sender_phone: "phone",
          sender_email: "email",
          remark: "message",
          pid: "propertyId",
          project_name: "propertyName"
        },
        defaultStatus: "NEW" as const,
        dedupeWindow: 24,
        isActive: true,
      },
      {
        name: "Housing.com",
        type: "PORTAL_WEBHOOK" as const,
        webhookToken: "housing-token-uv-2026",
        fieldMapping: {
          lead_name: "name",
          lead_phone: "phone",
          lead_email: "email",
          query_message: "message",
          property_id: "propertyId"
        },
        defaultStatus: "NEW" as const,
        dedupeWindow: 24,
        isActive: true,
      },
      {
        name: "NoBroker",
        type: "PORTAL_WEBHOOK" as const,
        webhookToken: "nobroker-token-uv-2026",
        fieldMapping: {
          name: "name",
          phone: "phone",
          email: "email",
          message: "message",
          listing_id: "propertyId"
        },
        defaultStatus: "NEW" as const,
        dedupeWindow: 24,
        isActive: true,
      },
      {
        name: "WhatsApp Business",
        type: "WHATSAPP" as const,
        webhookToken: "whatsapp-token-uv-2026",
        fieldMapping: null,
        defaultStatus: "NEW" as const,
        dedupeWindow: 24,
        isActive: true,
      },
      {
        name: "Gmail Inbox",
        type: "GMAIL" as const,
        webhookToken: "gmail-token-uv-2026",
        fieldMapping: null,
        defaultStatus: "NEW" as const,
        dedupeWindow: 24,
        isActive: true,
      },
      {
        name: "Website Form",
        type: "WEBSITE_FORM" as const,
        webhookToken: "website-token-uv-2026",
        fieldMapping: null,
        defaultStatus: "NEW" as const,
        dedupeWindow: 24,
        isActive: true,
      }
    ];

    for (const source of inboundSources) {
      await prisma.inboundSource.upsert({
        where: { webhookToken: source.webhookToken },
        update: source,
        create: source,
      });
    }
    console.log("Inbound sources seeded.");

    console.log("Database seeding completed successfully!");
  } catch (error) {
    console.error("Error during database seeding:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
