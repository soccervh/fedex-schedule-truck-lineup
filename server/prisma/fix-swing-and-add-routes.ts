import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Routes that were incorrectly permanently assigned to swing drivers — need to undo
const routesToClear = ['110', '220', '416', '408', '302', '140', '248', '104',
  '212', '338', '319', '324', '428', '309', '102', '130', '250'];

// 800-series PM routes that need to be created
const pmRoutes = ['802', '807', '808', '818', '826', '845', '846', '855',
  '880', '881', '882', '883', '884', '885', '886'];

// Missing people to add as SWING
const missingPeople = [
  { name: 'Abyadh', role: 'SWING' },      // only last name from image
  { name: 'Bumgardner', role: 'SWING' },
  { name: 'McWortner', role: 'SWING' },
  { name: 'Oldfield', role: 'SWING' },
];

async function main() {
  // 1. Undo permanent route assignments for swing drivers
  console.log('=== UNDOING SWING ROUTE ASSIGNMENTS ===');
  const swingUsers = await prisma.user.findMany({ where: { role: 'SWING', isActive: true } });
  const swingIds = swingUsers.map(u => u.id);

  for (const routeNum of routesToClear) {
    const route = await prisma.route.findFirst({
      where: { number: routeNum, isActive: true, driverId: { in: swingIds } },
    });
    if (route) {
      const driver = swingUsers.find(u => u.id === route.driverId);
      await prisma.route.update({ where: { id: route.id }, data: { driverId: null } });
      console.log(`  ✓ Cleared ${driver?.name} from R:${routeNum}`);
    }
  }

  // 2. Create 800-series PM routes
  console.log('\n=== CREATING PM ROUTES ===');
  for (const routeNum of pmRoutes) {
    const existing = await prisma.route.findFirst({ where: { number: routeNum } });
    if (existing) {
      console.log(`  • R:${routeNum} already exists`);
      continue;
    }
    await prisma.route.create({
      data: {
        number: routeNum,
        assignedArea: 'BELT_SPOT',
        isActive: true,
        schedule: 'MON_FRI',
      },
    });
    console.log(`  ✓ Created R:${routeNum}`);
  }

  // 3. Add missing people as SWING
  console.log('\n=== ADDING MISSING PEOPLE ===');
  for (const person of missingPeople) {
    const existing = await prisma.user.findFirst({
      where: { name: { contains: person.name, mode: 'insensitive' }, isActive: true },
    });
    if (existing) {
      console.log(`  • ${person.name} already exists (${existing.name})`);
      if (existing.role !== 'SWING') {
        await prisma.user.update({ where: { id: existing.id }, data: { role: 'SWING' } });
        console.log(`    → updated to SWING`);
      }
      continue;
    }
    await prisma.user.create({
      data: {
        name: person.name,
        role: 'SWING',
        accessLevel: 'EMPLOYEE',
        workSchedule: 'MON_FRI',
      },
    });
    console.log(`  ✓ Created ${person.name} as SWING (last name only — update full name later)`);
  }

  console.log('\nDone!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); await pool.end(); });
