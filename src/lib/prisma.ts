import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

let prisma: PrismaClient;

const connectionString = 
  process.env.DATABASE_URL || 
  process.env.POSTGRES_PRISMA_URL || 
  process.env.POSTGRES_URL || 
  process.env.POSTGRES_URL_NON_POOLING;

if (!connectionString) {
  console.warn('⚠️ WARNING: DATABASE_URL (or POSTGRES_PRISMA_URL) is not defined in environment variables. Using a fallback dummy connection string for build-time compilation.');
}

const dbUrl = connectionString || 'postgresql://dummy:dummy@localhost:5432/dummy';

const useSsl = dbUrl.includes('sslmode=') || 
               dbUrl.includes('.postgres.database.azure.com') ||
               dbUrl.includes('supabase') || 
               dbUrl.includes('neon.tech') ||
               (process.env.NODE_ENV === 'production' && !dbUrl.includes('localhost') && !dbUrl.includes('127.0.0.1'));

let cleanDbUrl = dbUrl;
if (useSsl) {
  // Strip sslmode from the connection string to prevent pg-connection-string from overriding our ssl options
  try {
    const parsedUrl = new URL(dbUrl);
    parsedUrl.searchParams.delete('sslmode');
    cleanDbUrl = parsedUrl.toString();
  } catch (e) {
    cleanDbUrl = dbUrl.replace(/[\?&]sslmode=[^&]+/g, '');
    if (cleanDbUrl.endsWith('?') || cleanDbUrl.endsWith('&')) {
      cleanDbUrl = cleanDbUrl.slice(0, -1);
    }
  }
}

const poolConfig: any = { connectionString: cleanDbUrl };
if (useSsl) {
  poolConfig.ssl = { rejectUnauthorized: false };
}

// Diagnostic logs (safe and masked)
console.log("🔌 Prisma Init - Connection string present:", !!connectionString);
console.log("🔌 Prisma Init - SSL configured:", useSsl);
try {
  const maskedUrl = dbUrl.replace(/:[^:@]+@/, ':****@');
  console.log("🔌 Prisma Init - Target Host:", maskedUrl.split('@')[1] || "unknown");
} catch (e) {
  // ignore
}

if (process.env.NODE_ENV === 'production') {
  const pool = new pg.Pool(poolConfig);
  const adapter = new PrismaPg(pool);
  prisma = new PrismaClient({ adapter });
} else {
  // Prevent multiple instances of Prisma Client in development due to hot reloading
  if (!(global as any).globalPrisma) {
    const pool = new pg.Pool(poolConfig);
    const adapter = new PrismaPg(pool);
    (global as any).globalPrisma = new PrismaClient({ adapter });
  }
  prisma = (global as any).globalPrisma;
}

export default prisma;
