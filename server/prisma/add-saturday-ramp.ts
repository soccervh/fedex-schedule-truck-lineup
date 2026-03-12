import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const existing = await prisma.facilityArea.findFirst({
    where: { name: 'DOC', subArea: 'SAT-Ramp', schedule: 'SATURDAY' },
  });

  if (existing) {
    console.log('SAT-Ramp area already exists — skipping');
    return;
  }

  const area = await prisma.facilityArea.create({
    data: { name: 'DOC', subArea: 'SAT-Ramp', schedule: 'SATURDAY' },
  });

  await prisma.facilitySpot.create({ data: { areaId: area.id, number: 1, label: 'Ramp1' } });
  await prisma.facilitySpot.create({ data: { areaId: area.id, number: 2, label: 'Ramp2' } });

  console.log('Created DOC SAT-Ramp area with 2 spots');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); await pool.end(); });
