import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Swing drivers from the schedule image, with their primary Tue-Fri route
const swingDrivers = [
  { lastName: 'Abyadh', route: '110' },
  { lastName: 'Arteaga', route: '220' },
  { lastName: 'Augustin', route: '416' },
  { lastName: 'Azbell', route: '408' },
  { lastName: 'Baker', route: '302' },
  { lastName: 'Bumgardner', route: '128' },
  { lastName: 'Bunch', route: '845' },
  { lastName: 'Carr', route: '140' },
  { lastName: 'Castle', route: '248' },
  { lastName: 'Dillard', route: '883' },
  { lastName: 'Fenik', route: '882' },
  { lastName: 'Fofana', route: '104' },
  { lastName: 'Forrest', route: '410' },
  { lastName: 'Frost', route: '212' },
  { lastName: 'Gabel', route: '338' },
  { lastName: 'Gordon', route: '807' },
  { lastName: 'Hall', route: '319' },
  { lastName: 'Hines', route: '846' },
  { lastName: 'Hudson', route: '808' },
  { lastName: 'Jones', route: '324' },
  { lastName: 'Lehoe', route: '428' },
  { lastName: 'Lisee', route: '802' },
  { lastName: 'Lisk', route: '309' },
  { lastName: 'McWortner', route: '881' },
  { lastName: 'Mosley', route: '102' },
  { lastName: 'Oldfield', route: '855' },
  { lastName: 'Redmond', route: '855' },
  { lastName: 'Sherman', route: '406' },
  { lastName: 'Shuler', route: '818' },
  { lastName: 'Sparks', route: '130' },
  { lastName: 'Ware', route: '250' },
];

async function main() {
  const allUsers = await prisma.user.findMany({ where: { isActive: true } });
  const allRoutes = await prisma.route.findMany({ where: { isActive: true } });

  const results: string[] = [];
  const notFound: string[] = [];
  const routeNotFound: string[] = [];
  const routeConflicts: string[] = [];

  for (const swing of swingDrivers) {
    // Find user by last name
    const user = allUsers.find(u =>
      u.name.toLowerCase().endsWith(` ${swing.lastName.toLowerCase()}`)
    );

    if (!user) {
      notFound.push(swing.lastName);
      continue;
    }

    // Update role to SWING
    if (user.role !== 'SWING') {
      await prisma.user.update({
        where: { id: user.id },
        data: { role: 'SWING' },
      });
      results.push(`✓ ${user.name} → SWING`);
    } else {
      results.push(`• ${user.name} already SWING`);
    }

    // Find the route
    const route = allRoutes.find(r => r.number === swing.route);
    if (!route) {
      routeNotFound.push(`${swing.lastName} → R:${swing.route}`);
      continue;
    }

    // Assign driver to route
    if (route.driverId && route.driverId !== user.id) {
      const currentDriver = allUsers.find(u => u.id === route.driverId);
      routeConflicts.push(`${swing.lastName} → R:${swing.route} (currently assigned to ${currentDriver?.name || 'unknown'})`);
      continue;
    }

    if (route.driverId !== user.id) {
      await prisma.route.update({
        where: { id: route.id },
        data: { driverId: user.id },
      });
      results.push(`  → assigned to R:${swing.route}`);
    } else {
      results.push(`  → already on R:${swing.route}`);
    }
  }

  console.log('\n=== ROLE UPDATES ===');
  results.forEach(r => console.log(r));

  if (notFound.length) {
    console.log('\n=== PEOPLE NOT FOUND ===');
    notFound.forEach(n => console.log(`  ✗ ${n}`));
  }

  if (routeNotFound.length) {
    console.log('\n=== ROUTES NOT IN DATABASE ===');
    routeNotFound.forEach(r => console.log(`  ✗ ${r}`));
  }

  if (routeConflicts.length) {
    console.log('\n=== ROUTE CONFLICTS (skipped) ===');
    routeConflicts.forEach(c => console.log(`  ⚠ ${c}`));
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); await pool.end(); });
