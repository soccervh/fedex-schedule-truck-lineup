import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // 1. Create Saturday facility areas and spots
  console.log('=== Creating Saturday Facility Areas ===\n');

  const satAreas = [
    {
      name: 'UNLOAD', subArea: 'Saturday', schedule: 'SATURDAY',
      spots: [
        { number: 1, label: 'U1' },
        { number: 2, label: 'U2' },
        { number: 3, label: 'U3' },
      ],
    },
    {
      name: 'SORT', subArea: 'Saturday', schedule: 'SATURDAY',
      spots: [
        { number: 1, label: 'LF1' },
        { number: 2, label: 'LF2' },
        { number: 3, label: 'SC1' },
        { number: 4, label: 'SC2' },
        { number: 5, label: 'SP1' },
        { number: 6, label: 'SP2' },
      ],
    },
    {
      name: 'FO', subArea: 'Saturday', schedule: 'SATURDAY',
      spots: [
        { number: 1, label: null },
        { number: 2, label: null },
        { number: 3, label: null },
        { number: 4, label: null },
        { number: 5, label: null },
      ],
    },
    {
      name: 'DOC', subArea: 'SAT-Fine Sort', schedule: 'SATURDAY',
      spots: [
        { number: 1, label: 'FS1' },
        { number: 2, label: 'FS2' },
      ],
    },
    {
      name: 'DOC', subArea: 'SAT-Secondary', schedule: 'SATURDAY',
      spots: [
        { number: 1, label: 'S1' },
        { number: 2, label: 'S2' },
      ],
    },
  ];

  for (const areaDef of satAreas) {
    // Check if already exists
    const existing = await prisma.facilityArea.findFirst({
      where: { name: areaDef.name, subArea: areaDef.subArea, schedule: 'SATURDAY' },
    });

    if (existing) {
      console.log(`Area ${areaDef.name}-${areaDef.subArea} already exists — skipping`);
      continue;
    }

    const area = await prisma.facilityArea.create({
      data: {
        name: areaDef.name,
        subArea: areaDef.subArea,
        schedule: 'SATURDAY',
      },
    });

    for (const spotDef of areaDef.spots) {
      await prisma.facilitySpot.create({
        data: {
          areaId: area.id,
          number: spotDef.number,
          label: spotDef.label,
        },
      });
    }

    console.log(`Created ${areaDef.name}-${areaDef.subArea}: ${areaDef.spots.length} spots`);
  }

  // 2. Assign Saturday routes to A and B belt spots
  console.log('\n=== Assigning Saturday Routes to Belt Spots ===\n');

  // Get A and B belts
  const beltA = await prisma.belt.findFirst({ where: { letter: 'A' }, include: { spots: { orderBy: { number: 'asc' } } } });
  const beltB = await prisma.belt.findFirst({ where: { letter: 'B' }, include: { spots: { orderBy: { number: 'asc' } } } });

  if (!beltA || !beltB) {
    console.error('Belt A or B not found!');
    return;
  }

  // A belt gets even routes: 502, 504, 506... (15 spots)
  const evenRoutes = [];
  for (let n = 502; n <= 530; n += 2) evenRoutes.push(String(n));

  // B belt gets odd routes: 501, 503, 505... (15 spots)
  const oddRoutes = [];
  for (let n = 501; n <= 529; n += 2) oddRoutes.push(String(n));

  let assigned = 0;

  for (let i = 0; i < 15; i++) {
    // A belt - spot i+1 gets even route
    const aSpot = beltA.spots.find(s => s.number === i + 1);
    if (aSpot && evenRoutes[i]) {
      const route = await prisma.route.findUnique({ where: { number: evenRoutes[i] } });
      if (route) {
        await prisma.route.update({
          where: { id: route.id },
          data: { beltSpotId: aSpot.id, assignedArea: 'BELT_SPOT' },
        });
        console.log(`A${i + 1} → R:${evenRoutes[i]}`);
        assigned++;
      }
    }

    // B belt - spot i+1 gets odd route
    const bSpot = beltB.spots.find(s => s.number === i + 1);
    if (bSpot && oddRoutes[i]) {
      const route = await prisma.route.findUnique({ where: { number: oddRoutes[i] } });
      if (route) {
        await prisma.route.update({
          where: { id: route.id },
          data: { beltSpotId: bSpot.id, assignedArea: 'BELT_SPOT' },
        });
        console.log(`B${i + 1} → R:${oddRoutes[i]}`);
        assigned++;
      }
    }
  }

  console.log(`\nAssigned ${assigned} routes to belt spots`);
  console.log('\nDone!');
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
