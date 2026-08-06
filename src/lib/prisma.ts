import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

let prisma: PrismaClient;

const connectionString = 
  process.env.POSTGRES_PRISMA_URL || 
  process.env.POSTGRES_URL || 
  process.env.DATABASE_URL || 
  process.env.POSTGRES_URL_NON_POOLING;

if (!connectionString) {
  console.warn('⚠️ WARNING: DATABASE_URL is not defined in environment variables. Using fallback connection string for compilation.');
}

const rawDbUrl = connectionString || 'postgresql://dummy:dummy@127.0.0.1:5432/dummy';

const useSsl = rawDbUrl.includes('sslmode=') || 
               rawDbUrl.includes('.postgres.database.azure.com') ||
               rawDbUrl.includes('supabase') || 
               rawDbUrl.includes('neon.tech') ||
               rawDbUrl.includes('vercel-storage') ||
               (process.env.NODE_ENV === 'production' && !rawDbUrl.includes('localhost') && !rawDbUrl.includes('127.0.0.1'));

let cleanDbUrl = rawDbUrl;
if (useSsl) {
  try {
    const parsedUrl = new URL(rawDbUrl);
    parsedUrl.searchParams.delete('sslmode');
    cleanDbUrl = parsedUrl.toString();
  } catch (e) {
    cleanDbUrl = rawDbUrl.replace(/[\?&]sslmode=[^&]+/g, '');
    if (cleanDbUrl.endsWith('?') || cleanDbUrl.endsWith('&')) {
      cleanDbUrl = cleanDbUrl.slice(0, -1);
    }
  }
}

const poolConfig: any = { 
  connectionString: cleanDbUrl,
  max: 5,
  idleTimeoutMillis: 1000,
  connectionTimeoutMillis: 3000,
  allowExitOnIdle: true
};

if (useSsl) {
  poolConfig.ssl = { rejectUnauthorized: false };
}

// Diagnostic logs
console.log("🔌 Prisma Init - Connection string present:", !!connectionString);
console.log("🔌 Prisma Init - SSL configured:", useSsl);

if (process.env.NODE_ENV === 'production') {
  const pool = new pg.Pool(poolConfig);
  const adapter = new PrismaPg(pool);
  prisma = new PrismaClient({ adapter });
} else {
  if (!(global as any).globalPrisma) {
    const pool = new pg.Pool(poolConfig);
    const adapter = new PrismaPg(pool);
    (global as any).globalPrisma = new PrismaClient({ adapter });
  }
  prisma = (global as any).globalPrisma;
}

export default prisma;
