import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
// @ts-ignore pg types
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
});
const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({ adapter });
