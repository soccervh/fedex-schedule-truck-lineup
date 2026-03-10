// Seed vacation/time-off data from VALET schedule photos
// Run with: cd server && DATABASE_URL=$(cd .. && railway variables --json 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin)['DATABASE_URL'])") npx tsx scripts/seed-vacations.ts

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
// @ts-ignore
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Helper: generate weekday dates (Mon-Fri) for a given week starting Monday
function weekdays(mondayStr: string): string[] {
  const mon = new Date(mondayStr + 'T00:00:00Z');
  const dates: string[] = [];
  for (let i = 0; i < 5; i++) {
    const d = new Date(mon);
    d.setUTCDate(d.getUTCDate() + i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}

// Helper: specific dates
function dates(...dateStrs: string[]): string[] {
  return dateStrs;
}

// Vacation data extracted from schedule photos
// Format: [lastName (for matching), type, dates[]]
type VacEntry = [string, 'VACATION_WEEK' | 'PERSONAL' | 'HOLIDAY', string[]];

const vacations: VacEntry[] = [
  // === MARCH 2026 ===

  // Week of 3/2-3/6
  ['Hoepfner', 'VACATION_WEEK', weekdays('2026-03-02')],
  ['Nelson Planck', 'VACATION_WEEK', weekdays('2026-03-02')],

  // Week of 3/9-3/13
  ['Scarberry', 'VACATION_WEEK', weekdays('2026-03-09')],
  ['Moss', 'VACATION_WEEK', weekdays('2026-03-09')],
  ['Burton', 'VACATION_WEEK', weekdays('2026-03-09')],
  ['Kent', 'VACATION_WEEK', weekdays('2026-03-09')],
  ['Lett', 'VACATION_WEEK', weekdays('2026-03-09')],
  ['Castle', 'VACATION_WEEK', weekdays('2026-03-09')],
  // Personal
  ['Stevens', 'PERSONAL', weekdays('2026-03-09')],

  // Week of 3/15-3/20 (note: Sat included for Tue-Sat people)
  ['Burgess', 'VACATION_WEEK', weekdays('2026-03-16')],
  ['Brown', 'VACATION_WEEK', weekdays('2026-03-16')], // Mitch Brown
  ['Watson', 'VACATION_WEEK', weekdays('2026-03-16')], // Randy Watson
  ['Kelly', 'VACATION_WEEK', weekdays('2026-03-16')], // M Kelly
  ['Ward', 'VACATION_WEEK', weekdays('2026-03-16')], // K Ward
  ['Aubrey', 'VACATION_WEEK', weekdays('2026-03-16')],
  ['Malebraniche', 'VACATION_WEEK', weekdays('2026-03-16')],
  ['Schutte', 'VACATION_WEEK', weekdays('2026-03-16')],
  // Personal
  ['McCann', 'PERSONAL', weekdays('2026-03-16')],

  // Week of 3/22-3/27
  ['Watson', 'VACATION_WEEK', weekdays('2026-03-23')], // Randy Watson
  ['Williamson', 'VACATION_WEEK', weekdays('2026-03-23')], // B Williamson
  ['Latham', 'VACATION_WEEK', weekdays('2026-03-23')], // L Latham
  ['Reedy', 'VACATION_WEEK', weekdays('2026-03-23')],
  // Personal
  ['McCabe', 'PERSONAL', weekdays('2026-03-23')],

  // Week of 3/29-4/3
  ['Miller', 'VACATION_WEEK', weekdays('2026-03-30')], // Mark Miller
  ['Moeller', 'VACATION_WEEK', weekdays('2026-03-30')], // G Moeller
  ['McEwen', 'VACATION_WEEK', weekdays('2026-03-30')],
  ['Dorris', 'VACATION_WEEK', weekdays('2026-03-30')],

  // === APRIL 2026 ===

  // Week of 4/6-4/10
  ['Brake', 'VACATION_WEEK', weekdays('2026-04-06')],
  ['Christman', 'VACATION_WEEK', weekdays('2026-04-06')],
  ['Long', 'VACATION_WEEK', weekdays('2026-04-06')],
  ['Cox', 'VACATION_WEEK', weekdays('2026-04-06')],
  ['Wheeler', 'VACATION_WEEK', weekdays('2026-04-06')],
  ['Buckley', 'VACATION_WEEK', weekdays('2026-04-06')],
  ['Green', 'VACATION_WEEK', weekdays('2026-04-06')],
  ['Robinson', 'VACATION_WEEK', weekdays('2026-04-06')], // D Robinson
  ['Moore', 'VACATION_WEEK', weekdays('2026-04-06')],
  ['Wright', 'VACATION_WEEK', weekdays('2026-04-06')],
  ['Fortner', 'VACATION_WEEK', weekdays('2026-04-06')],
  ['Collins', 'VACATION_WEEK', weekdays('2026-04-06')],
  ['Jones', 'VACATION_WEEK', weekdays('2026-04-06')], // D Jones
  ['Moeller', 'VACATION_WEEK', weekdays('2026-04-06')],
  // Personal
  ['Sawyerr', 'PERSONAL', weekdays('2026-04-06')],

  // Week of 4/13-4/17
  ['Hartman', 'VACATION_WEEK', weekdays('2026-04-13')], // Laurence Hartman
  ['Williams', 'VACATION_WEEK', weekdays('2026-04-13')], // T Williams
  ['Underwood', 'VACATION_WEEK', weekdays('2026-04-13')],
  ['Burton', 'VACATION_WEEK', weekdays('2026-04-13')],
  ['Lorenz', 'VACATION_WEEK', weekdays('2026-04-13')],
  ['Malebraniche', 'VACATION_WEEK', weekdays('2026-04-13')],
  ['Hazzard', 'VACATION_WEEK', weekdays('2026-04-13')],
  ['Craft', 'VACATION_WEEK', weekdays('2026-04-13')],
  ['Lamar', 'VACATION_WEEK', weekdays('2026-04-13')],
  ['Sweitzer', 'VACATION_WEEK', weekdays('2026-04-13')],
  // Personal
  ['Sawyerr', 'PERSONAL', weekdays('2026-04-13')],

  // Week of 4/20-4/24
  ['McDevitt', 'VACATION_WEEK', weekdays('2026-04-20')], // John McDevitt
  ['Brown', 'VACATION_WEEK', weekdays('2026-04-20')], // Mitch Brown
  ['Miller', 'VACATION_WEEK', weekdays('2026-04-20')], // Mark Miller
  ['Finegan-Todd', 'VACATION_WEEK', weekdays('2026-04-20')],
  ['Ackley', 'VACATION_WEEK', weekdays('2026-04-20')],
  // Personal
  ['Sawyerr', 'PERSONAL', weekdays('2026-04-20')],

  // Week of 4/27-5/1
  ['Miller', 'VACATION_WEEK', weekdays('2026-04-27')],
  ['Keels', 'VACATION_WEEK', weekdays('2026-04-27')],
  ['Scarberry', 'PERSONAL', weekdays('2026-04-27')],

  // === MAY 2026 ===

  // Week of 5/4-5/8
  ['Trease', 'VACATION_WEEK', weekdays('2026-05-04')],
  ['Hall', 'VACATION_WEEK', weekdays('2026-05-04')], // T Hall
  ['Armstrong', 'VACATION_WEEK', weekdays('2026-05-04')],
  ['Woods', 'VACATION_WEEK', weekdays('2026-05-04')],
  ['Epling', 'VACATION_WEEK', weekdays('2026-05-04')],
  ['Long', 'VACATION_WEEK', weekdays('2026-05-04')],
  ['Olson', 'VACATION_WEEK', weekdays('2026-05-04')],
  // Personal
  ['Sawyerr', 'PERSONAL', weekdays('2026-05-04')],

  // Week of 5/11-5/15
  ['Brown', 'VACATION_WEEK', weekdays('2026-05-11')], // Mitch Brown
  ['Kette', 'VACATION_WEEK', weekdays('2026-05-11')],
  ['Butsko', 'VACATION_WEEK', weekdays('2026-05-11')],
  ['Lorenz', 'VACATION_WEEK', weekdays('2026-05-11')],
  ['Trease', 'VACATION_WEEK', weekdays('2026-05-11')],
  ['Malebraniche', 'VACATION_WEEK', weekdays('2026-05-11')],
  ['Hall', 'VACATION_WEEK', weekdays('2026-05-11')], // T Hall
  ['Layne', 'VACATION_WEEK', weekdays('2026-05-11')],
  ['Hazzard', 'VACATION_WEEK', weekdays('2026-05-11')],
  ['Gordon', 'VACATION_WEEK', weekdays('2026-05-11')],
  ['Collins', 'VACATION_WEEK', weekdays('2026-05-11')],
  ['Loesch', 'VACATION_WEEK', weekdays('2026-05-11')],
  ['Lamar', 'VACATION_WEEK', weekdays('2026-05-11')],

  // Week of 5/18-5/22
  ['Brown', 'VACATION_WEEK', weekdays('2026-05-18')], // Mitch Brown
  ['Lett', 'VACATION_WEEK', weekdays('2026-05-18')],
  ['Kette', 'VACATION_WEEK', weekdays('2026-05-18')],
  ['Williams', 'VACATION_WEEK', weekdays('2026-05-18')], // B Williams
  ['Ream', 'VACATION_WEEK', weekdays('2026-05-18')],
  ['Hazzard', 'VACATION_WEEK', weekdays('2026-05-18')],
  ['McEwen', 'VACATION_WEEK', weekdays('2026-05-18')],
  ['Orso', 'VACATION_WEEK', weekdays('2026-05-18')],
  ['Spencer', 'VACATION_WEEK', weekdays('2026-05-18')],
  ['Kinkead', 'VACATION_WEEK', weekdays('2026-05-18')],
  ['Burgess', 'VACATION_WEEK', weekdays('2026-05-18')],
  // Personal
  ['Braughton', 'PERSONAL', weekdays('2026-05-18')],

  // Week of 5/25-5/29 (Memorial Day Mon 5/25)
  ['Burbridge', 'VACATION_WEEK', weekdays('2026-05-26')], // Tue-Fri only (Memorial Day Mon)
  ['Piper', 'VACATION_WEEK', weekdays('2026-05-26')], // Kelly Piper
  ['Williams', 'VACATION_WEEK', weekdays('2026-05-26')], // T Williams
  ['Kelly', 'VACATION_WEEK', weekdays('2026-05-26')], // M Kelly
  ['Nelson Planck', 'VACATION_WEEK', weekdays('2026-05-26')],
  ['Reeds', 'VACATION_WEEK', weekdays('2026-05-26')],
];

// Ambiguous last names - prefer specific first names when multiple matches
const preferredFirstNames: Record<string, string> = {
  'Brown': 'Mitchell', // Mitch Brown
  'Watson': 'Randall', // Randy Watson (no Tamara Watson match needed for now)
  'Miller': 'Mark', // Mark Miller (not Kenya Miller)
  'Williams': 'Teddye', // for T Williams; override per week if needed
  'Kelly': 'Michael', // M Kelly
  'Ward': 'Kelly', // K Ward
  'Hall': 'Travis', // T Hall
  'Collins': 'Eric', // E Collins
  'Jones': 'Stanley', // D Jones - might be wrong, check
  'Moeller': 'Greg', // G Moeller
  'Robinson': 'Doug', // D Robinson
  'Lett': 'Jeremy', // J Lett
  'Woods': 'Hollis', // H Woods
  'Long': 'Shon', // not sure - possibly not in DB by this name
};

async function main() {
  console.log('Looking up users and creating vacation entries...\n');

  // Get all active users
  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
  });

  let created = 0;
  let skipped = 0;
  let notFound: string[] = [];

  for (const [lastName, type, dateList] of vacations) {
    // Find user by last name
    const matches = users.filter(u => {
      const nameParts = u.name.toLowerCase().split(' ');
      const searchParts = lastName.toLowerCase().split(' ');
      // Check if the last part(s) of the name match
      if (searchParts.length === 1) {
        return nameParts[nameParts.length - 1] === searchParts[0] ||
               (nameParts.length > 2 && nameParts.slice(1).join(' ').toLowerCase().includes(searchParts[0]));
      }
      // Multi-word last name (e.g., "Nelson Planck")
      return u.name.toLowerCase().includes(lastName.toLowerCase());
    });

    let user = matches[0];

    if (matches.length > 1) {
      // Disambiguate with preferred first name
      const preferred = preferredFirstNames[lastName];
      if (preferred) {
        const found = matches.find(u => u.name.toLowerCase().startsWith(preferred.toLowerCase()));
        if (found) user = found;
      }
    }

    if (!user) {
      if (!notFound.includes(lastName)) {
        notFound.push(lastName);
        console.log(`  NOT FOUND: "${lastName}"`);
      }
      continue;
    }

    for (const dateStr of dateList) {
      const date = new Date(dateStr + 'T00:00:00Z');
      try {
        await prisma.timeOff.upsert({
          where: { userId_date: { userId: user.id, date } },
          update: {}, // Don't overwrite existing entries
          create: {
            userId: user.id,
            date,
            type,
            status: 'APPROVED',
            isImported: true,
            note: 'Imported from VALET vacation schedule',
          },
        });
        created++;
      } catch (e: any) {
        if (e.code === 'P2002') {
          skipped++; // Already exists
        } else {
          console.error(`  ERROR for ${user.name} on ${dateStr}:`, e.message);
        }
      }
    }
    console.log(`  ${user.name}: ${dateList.length} days (${type}) - ${dateList[0]} to ${dateList[dateList.length - 1]}`);
  }

  console.log(`\nDone! Created: ${created}, Skipped: ${skipped}`);
  if (notFound.length > 0) {
    console.log(`\nNot found (${notFound.length}): ${notFound.join(', ')}`);
    console.log('These people may need to be added to the database first, or the name may be different.');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
