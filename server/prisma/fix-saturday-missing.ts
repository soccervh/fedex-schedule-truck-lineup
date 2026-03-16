import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // 1. Add Stroshacker and Daniels-Jackson
  console.log('=== ADDING MISSING PEOPLE ===');
  for (const person of ['Stroshacker', 'Daniels-Jackson']) {
    const existing = await prisma.user.findFirst({
      where: { name: { contains: person, mode: 'insensitive' }, isActive: true },
    });
    if (existing) {
      console.log(`• ${person} already exists: ${existing.name}`);
      if (existing.workSchedule !== 'TUE_SAT') {
        await prisma.user.update({ where: { id: existing.id }, data: { workSchedule: 'TUE_SAT' } });
      }
    } else {
      const user = await prisma.user.create({
        data: { name: person, role: 'DRIVER', accessLevel: 'EMPLOYEE', workSchedule: 'TUE_SAT' },
      });
      console.log(`✓ Created ${person} as TUE_SAT DRIVER`);

      // Assign Saturday route
      const routeNum = person === 'Stroshacker' ? '503' : '529';
      const route = await prisma.route.findFirst({ where: { number: routeNum, schedule: 'SAT_ONLY' } });
      if (route) {
        await prisma.route.update({ where: { id: route.id }, data: { driverId: user.id } });
        console.log(`  → assigned to SAT R:${routeNum}`);
      }
    }
  }

  // 2. Fix Davis assignments: Bri. Davis = Brian Davis → R:506, Bra. Davis = Bradford Davis → R:532
  console.log('\n=== FIXING DAVIS ASSIGNMENTS ===');
  const brianDavis = await prisma.user.findFirst({
    where: { name: { contains: 'Brian Davis', mode: 'insensitive' }, isActive: true },
  });
  const bradfordDavis = await prisma.user.findFirst({
    where: { name: { contains: 'Bradford Davis', mode: 'insensitive' }, isActive: true },
  });

  if (brianDavis) {
    await prisma.user.update({ where: { id: brianDavis.id }, data: { workSchedule: 'TUE_SAT' } });
    const route506 = await prisma.route.findFirst({ where: { number: '506', schedule: 'SAT_ONLY' } });
    if (route506) {
      await prisma.route.update({ where: { id: route506.id }, data: { driverId: brianDavis.id } });
      console.log(`✓ Brian Davis → TUE_SAT, assigned to SAT R:506`);
    }
  } else {
    console.log('✗ Brian Davis not found');
  }

  if (bradfordDavis) {
    // Bradford should already be TUE_SAT, just make sure R:532 is correct
    const route532 = await prisma.route.findFirst({ where: { number: '532', schedule: 'SAT_ONLY' } });
    if (route532 && route532.driverId === bradfordDavis.id) {
      console.log(`• Bradford Davis already on SAT R:532`);
    } else if (route532) {
      await prisma.route.update({ where: { id: route532.id }, data: { driverId: bradfordDavis.id } });
      console.log(`✓ Bradford Davis → assigned to SAT R:532`);
    }
  } else {
    console.log('✗ Bradford Davis not found');
  }

  console.log('\nDone!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); await pool.end(); });
