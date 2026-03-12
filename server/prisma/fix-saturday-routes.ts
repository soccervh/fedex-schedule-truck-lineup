import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const beltA = await prisma.belt.findFirst({ where: { letter: 'A' }, include: { spots: { orderBy: { number: 'asc' } } } });
  const beltB = await prisma.belt.findFirst({ where: { letter: 'B' }, include: { spots: { orderBy: { number: 'asc' } } } });

  if (!beltA || !beltB) { console.error('Belt not found'); return; }

  // A belt gets ODD routes: 501, 503, 505...529
  const oddRoutes = [];
  for (let n = 501; n <= 529; n += 2) oddRoutes.push(String(n));

  // B belt gets EVEN routes: 502, 504, 506...530
  const evenRoutes = [];
  for (let n = 502; n <= 530; n += 2) evenRoutes.push(String(n));

  let updated = 0;

  for (let i = 0; i < 15; i++) {
    const aSpot = beltA.spots.find(s => s.number === i + 1);
    if (aSpot && oddRoutes[i]) {
      const route = await prisma.route.findUnique({ where: { number: oddRoutes[i] } });
      if (route) {
        await prisma.route.update({ where: { id: route.id }, data: { beltSpotId: aSpot.id } });
        console.log(`A${i + 1} → R:${oddRoutes[i]}`);
        updated++;
      }
    }

    const bSpot = beltB.spots.find(s => s.number === i + 1);
    if (bSpot && evenRoutes[i]) {
      const route = await prisma.route.findUnique({ where: { number: evenRoutes[i] } });
      if (route) {
        await prisma.route.update({ where: { id: route.id }, data: { beltSpotId: bSpot.id } });
        console.log(`B${i + 1} → R:${evenRoutes[i]}`);
        updated++;
      }
    }
  }

  console.log(`\nSwapped ${updated} routes`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); await pool.end(); });
