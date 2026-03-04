import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  let created = 0;
  let skipped = 0;

  for (let num = 500; num <= 560; num++) {
    const number = String(num);
    const existing = await prisma.route.findUnique({ where: { number } });
    if (existing) {
      console.log(`Route ${number} already exists — skipping`);
      skipped++;
      continue;
    }

    await prisma.route.create({
      data: {
        number,
        assignedArea: 'EO_POOL',
        schedule: 'SAT_ONLY',
        isActive: true,
      },
    });
    created++;
    console.log(`Created route ${number} (SAT_ONLY)`);
  }

  console.log(`\nDone: ${created} created, ${skipped} skipped`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
