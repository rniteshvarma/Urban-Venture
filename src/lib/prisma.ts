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

if (process.env.NODE_ENV === 'production') {
  const pool = new pg.Pool({ connectionString: dbUrl });
  const adapter = new PrismaPg(pool);
  prisma = new PrismaClient({ adapter });
} else {
  // Prevent multiple instances of Prisma Client in development due to hot reloading
  if (!(global as any).globalPrisma) {
    const pool = new pg.Pool({ connectionString: dbUrl });
    const adapter = new PrismaPg(pool);
    (global as any).globalPrisma = new PrismaClient({ adapter });
  }
  prisma = (global as any).globalPrisma;
}

export default prisma;
