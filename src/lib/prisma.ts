import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

let prisma: PrismaClient;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not defined in environment variables.');
}

if (process.env.NODE_ENV === 'production') {
  const pool = new pg.Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  prisma = new PrismaClient({ adapter });
} else {
  // Prevent multiple instances of Prisma Client in development due to hot reloading
  if (!(global as any).globalPrisma) {
    const pool = new pg.Pool({ connectionString });
    const adapter = new PrismaPg(pool);
    (global as any).globalPrisma = new PrismaClient({ adapter });
  }
  prisma = (global as any).globalPrisma;
}

export default prisma;
