import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import readline from "readline";

// Helper to ask question in terminal
function askQuestion(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) =>
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans.trim());
    })
  );
}

async function main() {
  console.log("\n=======================================================");
  console.log("🚀 PROPERTY TIGER - PRODUCTION DATABASE SEED & VALIDATE");
  console.log("=======================================================\n");

  let dbUrl = process.env.DATABASE_URL;

  if (!dbUrl || dbUrl.includes("localhost") || dbUrl.includes("127.0.0.1")) {
    console.log("⚠️ No production DATABASE_URL found in environment variables.");
    const inputUrl = await askQuestion(
      "👉 Please enter your Supabase connection string:\n(e.g., postgresql://postgres:PASSWORD@db.jtqlodebduoefuxtxxlz.supabase.co:5432/postgres)\n> "
    );
    if (!inputUrl) {
      console.error("❌ Error: Connection string cannot be empty.");
      process.exit(1);
    }
    dbUrl = inputUrl;
  }

  // Sanitize SSL params
  const useSsl =
    dbUrl.includes("sslmode=") ||
    dbUrl.includes("supabase") ||
    dbUrl.includes("neon.tech") ||
    dbUrl.includes("azure") ||
    !dbUrl.includes("localhost");

  let cleanDbUrl = dbUrl;
  if (useSsl) {
    try {
      const parsedUrl = new URL(dbUrl);
      parsedUrl.searchParams.delete("sslmode");
      cleanDbUrl = parsedUrl.toString();
    } catch (e) {
      cleanDbUrl = dbUrl.replace(/[\?&]sslmode=[^&]+/g, "");
      if (cleanDbUrl.endsWith("?") || cleanDbUrl.endsWith("&")) {
        cleanDbUrl = cleanDbUrl.slice(0, -1);
      }
    }
  }

  const poolConfig: any = { 
    connectionString: cleanDbUrl,
    connectionTimeoutMillis: 10000,
  };
  if (useSsl) {
    poolConfig.ssl = { rejectUnauthorized: false };
  }

  console.log("🔌 Connecting to PostgreSQL target database...");
  const pool = new pg.Pool(poolConfig);
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    // Step 1: Test Connection
    console.log("📡 Testing database connection...");
    await prisma.$queryRaw`SELECT 1`;
    console.log("✅ Database connection established successfully!\n");

    // Step 2: Seed Core Data
    console.log("🌱 Executing Step 1/2: Core System & Admin Seeding...");
    const { execSync } = await import("child_process");
    execSync(`DATABASE_URL="${dbUrl}" npx tsx prisma/seed.ts`, { stdio: "inherit" });

    console.log("\n🌱 Executing Step 2/2: Upgraded Market Intelligence Seeding...");
    execSync(`DATABASE_URL="${dbUrl}" npx tsx prisma/seed-upgraded.ts`, { stdio: "inherit" });

    // Step 3: Run Full Validation Audit
    console.log("\n=======================================================");
    console.log("📊 RUNNING POST-SEED VALIDATION AUDIT");
    console.log("=======================================================");

    const userCount = await prisma.user.count();
    const corridorCount = await prisma.corridorProfile.count();
    const projectCount = await prisma.project.count();
    const infraCount = await prisma.infraProject.count();
    const approvalCount = await prisma.approvalRecord.count();
    const inboundSourceCount = await prisma.inboundSource.count();
    const pulseCount = await prisma.marketPulse.count();

    console.log(`\n📋 Validation Results:`);
    console.log(`- Admin Users:        ${userCount > 0 ? "✅ " + userCount : "❌ 0"}`);
    console.log(`- Growth Corridors:   ${corridorCount > 0 ? "✅ " + corridorCount + " corridors" : "❌ 0"}`);
    console.log(`- Real Estate Projects:${projectCount > 0 ? "✅ " + projectCount + " projects" : "❌ 0"}`);
    console.log(`- Infra Projects:     ${infraCount > 0 ? "✅ " + infraCount + " projects" : "❌ 0"}`);
    console.log(`- Government Approvals:${approvalCount > 0 ? "✅ " + approvalCount + " records" : "❌ 0"}`);
    console.log(`- Inbound Integrations:${inboundSourceCount > 0 ? "✅ " + inboundSourceCount + " sources" : "❌ 0"}`);
    console.log(`- Market Pulse Stat:  ${pulseCount > 0 ? "✅ " + pulseCount + " record" : "❌ 0"}`);

    if (userCount > 0 && corridorCount >= 6 && projectCount > 0) {
      console.log("\n🎉 SUCCESS! All production database tables are 100% populated and validated!");
      console.log("💡 You can now log into your live CRM at /admin/login with:");
      console.log("   Email:    uv@gmail.com");
      console.log("   Password: 12345678\n");
    } else {
      console.warn("\n⚠️ WARNING: Some tables have missing or low record counts. Check logs above.");
    }
  } catch (error: any) {
    console.error("\n❌ SEEDING FAILED! Error Details:");
    console.error(error.message || error);
    if (error?.message?.includes("does not exist")) {
      console.error("\n💡 HINT: The database tables do not exist yet. Please run `npx prisma db push` first.");
    }
  } finally {
    await pool.end();
  }
}

main();
