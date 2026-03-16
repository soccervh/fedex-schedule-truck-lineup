import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Regular Saturday workers (white cells only) from the lineup image
// { lastName, firstName (if shown), route, belt }
const saturdayWorkers = [
  // Belt B
  { lastName: 'Peck', route: '502', belt: 'B', spot: 2 },
  { lastName: 'Jones', firstName: 'D.', route: '504', belt: 'B', spot: 3 },
  { lastName: 'Davis', firstName: 'Bri.', route: '506', belt: 'B', spot: 4 },
  { lastName: 'Orso', route: '510', belt: 'B', spot: 6 },
  { lastName: 'Craft', route: '514', belt: 'B', spot: 8 },
  { lastName: 'Martinez', route: '516', belt: 'B', spot: 9 },
  { lastName: 'Shaw', route: '520', belt: 'B', spot: 11 },
  { lastName: 'Baughman', route: '522', belt: 'B', spot: 12 },
  { lastName: 'Comfort', route: '524', belt: 'B', spot: 13 },
  { lastName: 'Romero', route: '526', belt: 'B', spot: 14 },
  { lastName: 'Leri', route: '528', belt: 'B', spot: 15 },
  { lastName: 'Davis', firstName: 'Bra.', route: '532', belt: 'B', spot: 17 },
  { lastName: 'Crist', firstName: 'S.', route: '534', belt: 'B', spot: 18 },
  { lastName: 'Azbell', firstName: 'T.', route: '580', belt: 'B', spot: 19 },
  { lastName: 'McDonough', route: '576', belt: 'B', spot: 20 },
  // Belt A
  { lastName: 'Latham', firstName: 'K.', route: '501', belt: 'A', spot: 1 },
  { lastName: 'Stroshacker', route: '503', belt: 'A', spot: 2 },
  { lastName: 'McNeal', route: '505', belt: 'A', spot: 3 },
  { lastName: 'Jordan', firstName: 'T.', route: '507', belt: 'A', spot: 4 },
  { lastName: 'Watson', route: '509', belt: 'A', spot: 5 },
  { lastName: 'Ali', route: '511', belt: 'A', spot: 6 },
  { lastName: 'Baker', route: '515', belt: 'A', spot: 8 },
  { lastName: 'Green', route: '517', belt: 'A', spot: 9 },
  { lastName: 'Layne', route: '519', belt: 'A', spot: 10 },
  { lastName: 'Smith', firstName: 'A.', route: '523', belt: 'A', spot: 12 },
  { lastName: 'Hernandez', route: '525', belt: 'A', spot: 13 },
  { lastName: 'Chatters', route: '527', belt: 'A', spot: 14 },
  { lastName: 'Daniels-Jackson', route: '529', belt: 'A', spot: 15 },
  { lastName: 'Sorrells', route: '531', belt: 'A', spot: 16 },
  { lastName: 'Strand', route: '533', belt: 'A', spot: 17 },
];

async function main() {
  const allUsers = await prisma.user.findMany({ where: { isActive: true } });
  const allRoutes = await prisma.route.findMany({ where: { isActive: true } });

  const notFound: string[] = [];
  const ambiguous: string[] = [];
  const routesMissing: string[] = [];

  for (const worker of saturdayWorkers) {
    // Find user by last name, optionally narrow by first initial
    let matches = allUsers.filter(u =>
      u.name.toLowerCase().endsWith(` ${worker.lastName.toLowerCase()}`) ||
      u.name.toLowerCase().includes(`-${worker.lastName.toLowerCase()}`) ||
      u.name.toLowerCase().includes(`${worker.lastName.toLowerCase()}-`)
    );

    // For hyphenated names like Daniels-Jackson
    if (matches.length === 0) {
      matches = allUsers.filter(u =>
        u.name.toLowerCase().includes(worker.lastName.toLowerCase())
      );
    }

    // If multiple matches and we have a first initial, narrow down
    if (matches.length > 1 && worker.firstName) {
      const initial = worker.firstName[0].toUpperCase();
      const narrowed = matches.filter(u => u.name.startsWith(initial));
      if (narrowed.length > 0) matches = narrowed;
    }

    if (matches.length === 0) {
      notFound.push(`${worker.firstName || ''} ${worker.lastName} (R:${worker.route})`);
      continue;
    }

    if (matches.length > 1) {
      // Try to pick the one that's already TUE_SAT or not a manager
      const nonManagers = matches.filter(m => m.role !== 'MANAGER');
      if (nonManagers.length === 1) {
        matches = nonManagers;
      } else {
        ambiguous.push(`${worker.lastName}: ${matches.map(m => m.name).join(', ')}`);
        // Pick first non-manager match
        matches = nonManagers.length > 0 ? [nonManagers[0]] : [matches[0]];
      }
    }

    const user = matches[0];

    // Update to TUE_SAT
    if (user.workSchedule !== 'TUE_SAT') {
      await prisma.user.update({
        where: { id: user.id },
        data: { workSchedule: 'TUE_SAT' },
      });
      console.log(`✓ ${user.name} → TUE_SAT`);
    } else {
      console.log(`• ${user.name} already TUE_SAT`);
    }

    // Find the Saturday route
    let route = allRoutes.find(r => r.number === worker.route && r.schedule === 'SAT_ONLY');
    if (!route) {
      // Maybe need to create it
      const anyRoute = allRoutes.find(r => r.number === worker.route);
      if (!anyRoute) {
        // Create the SAT_ONLY route
        route = await prisma.route.create({
          data: {
            number: worker.route,
            assignedArea: 'BELT_SPOT',
            isActive: true,
            schedule: 'SAT_ONLY',
          },
        });
        console.log(`  → created SAT_ONLY route R:${worker.route}`);
      } else {
        routesMissing.push(`R:${worker.route} exists but is ${anyRoute.schedule}, not SAT_ONLY`);
        continue;
      }
    }

    // Assign driver to Saturday route
    if (route.driverId !== user.id) {
      await prisma.route.update({
        where: { id: route.id },
        data: { driverId: user.id },
      });
      console.log(`  → assigned to SAT R:${worker.route} (Belt ${worker.belt} spot ${worker.spot})`);
    } else {
      console.log(`  → already on SAT R:${worker.route}`);
    }
  }

  if (notFound.length) {
    console.log('\n=== PEOPLE NOT FOUND ===');
    notFound.forEach(n => console.log(`  ✗ ${n}`));
  }
  if (ambiguous.length) {
    console.log('\n=== AMBIGUOUS MATCHES (picked first) ===');
    ambiguous.forEach(a => console.log(`  ⚠ ${a}`));
  }
  if (routesMissing.length) {
    console.log('\n=== ROUTE ISSUES ===');
    routesMissing.forEach(r => console.log(`  ✗ ${r}`));
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); await pool.end(); });
