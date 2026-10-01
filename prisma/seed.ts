import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import bcrypt from 'bcryptjs';

// Developer projects are no longer seeded here: real Hyderabad inventory is
// loaded by scripts/inventory/seed-inventory.ts from prisma/data/hyderabad-inventory.json.

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
    // Projects are deliberately NOT wiped: they hold the researched inventory and
    // any project added by hand.
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
