// Bulk seed employees from VALET schedule screenshots
// Run with: cd server && npx tsx scripts/seed-employees.ts

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
// @ts-ignore
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const managers = [
  'Delaney Rotterman',
  'Julee Mcdevitt',
  'Kyle Morrison',
  'Christopher Hackett',
  'Donte Allen',
  'Kory Sharp',
  'Thomas Cahill',
];

const employees = [
  // Page 1 (A)
  'Aaron Carr',
  'Abdalla Ahmed',
  'Abdelali Benlemlih',
  'Adrienne Shannon',
  'Aja Sorrells',
  'Akielah Jones',
  'Alexis Shuler',
  'Alissa Fleming',
  'Amal Ahmed',
  'Aminah Ali',
  'Amy Corkins',
  'Amy Yeagley',
  'Andrew Castle',
  'Andrew Mazhindu',
  'Angela Moss',
  'Anthony Fortner',
  'Anthony Hines',
  'Anthony Mcclendon',
  'Anthony Shaw',
  'Ari Gabel',
  'Audrie Lowe',
  'Aujanique Smith',
  'Beth Nelson Planck',
  'Bradford Davis',
  'Bradley Azbell',
  'Brenden Lisk',
  'Brian Butsko',
  'Brian Davis',
  'Briana Wise',
  'Brittany Hill',
  'Bryan Bunch',
  'Cameron Colombini',
  'Carley Hamdi',
  'Cassandra Davis',
  'Catherine Lehoe',
  'Cecilia Donkor',

  // Page 2 (C-E)
  'Charles Romero',
  'Cheick Fofana',
  'Christian Guzman Jimenez',
  'Christian Hall',
  'Christine Hubbard',
  'Christopher Kette',
  'Christopher Mcewen',
  'Clifford Williams',
  'Cole Sparks',
  'Daniel Fann',
  'Daniel Green',
  'Daniel Jones',
  'Daniel Mosley',
  'Daniel Strohacker',
  'Danielle Peaks',
  'Darrell Miller',
  'Dasulise Point Du Jour',
  'David Doppes',
  'David Leri',
  'Deneen Huhold',
  'Denise Marshall',
  'Dennis Irwin',
  'Devon Peck',
  'Diamond Graham',
  'Don Milnor',
  'Donald Ferguson',
  'Donald Galloway',
  'Donald Kinkead',
  'Doug Robinson',
  'Douglas Ebersole',
  'Douglas Metcalf',
  'Dwight Aubrey',
  'Dylan Armstrong',
  'Eddye Williams',
  'Elaine Farmer',
  'Elijah Bennett',

  // Page 3 (E-J)
  'Eric Baughman',
  'Eric Collins',
  'Eric Schutte',
  'Evan Law',
  'Francine Barr',
  'Frederick Wheeler',
  'Gary Hudecek',
  'George Chatters',
  'Germaney Johnson',
  'Greg Moeller',
  'Gregory Smith',
  'Hani Alabndi',
  'Hollis Woods',
  'Hunter Williams',
  'Isaiah Ware',
  'Jacob Fenik',
  'James Brake',
  'James Malebraniche',
  'James Mason',
  'James Styers',
  'Jarrod Craft',
  'Jason Lorenz',
  'Jaylynn Hudson',
  'Jennifer Warren',
  'Jeremy Lett',
  'Jermaine Prysock',
  'Jesse Walton',
  'Joey Spencer',
  'John Mcdevitt',
  'Jonathan Epling',
  'Jonathan Frage',
  'Jordan Moore',
  'Jose Vazquez',
  'Joseph Augustin',
  'Joseph Bennett',
  'Joshua Moeller',

  // Page 4 (J-M)
  'Juanita Braughton',
  'Justin Pope',
  'Karen Mccann',
  'Kelly Piper',
  'Kelly Ward',
  'Kemmon Duggleby',
  'Kenneth Inyamah',
  'Kenya Miller',
  'Kevin Ackley',
  'Kevin Latham',
  'Kimani Warren',
  'Krista Marinacci',
  'Lamar Redmond',
  'Laquan Latham',
  'Larae Jackson',
  'Latala Mcneal',
  'Laurence Hartman',
  'Lisandro Hernandez',
  'Marc Lisee',
  'Mark Gordon',
  'Mark Hall',
  'Markus Burton',
  'Marlon Martinez Reyes',
  'Matt Ream',
  'Matthew Burress',
  'Matthew Hoffman',
  'Matthew Underwood',
  'Maximilian Cooper',
  'Michael Christman',
  'Michael Kelly',
  'Michael Marks',
  'Michael Richards',
  'Michael Scarberry',
  'Michael Sherman',
  'Michael Smith',
  'Michael Sprankle',

  // Page 5 (M-R)
  'Michael Wright',
  'Mickey Jenkins',
  'Mitchell Brown',
  'Nakiyah B.',
  'Nathan Ritchie',
  'Nathaniel Mcdonough',
  'Nicholas Driscoll',
  'Nicholas Mundy',
  'Olawale Akinpelu',
  'Omar Mcwhorter',
  'Orlando Frost',
  'Oscar Dorris',
  'Otho Ball',
  'Patrick Whitlatch',
  'Rachel Forrest',
  'Rachel Loos',
  'Rahsaun Ferguson',
  'Ralph Keels',
  'Randall Watson',
  'Randy Towns',
  'Real Comfort',
  'Richard Anderson',
  'Richard Carney',
  'Richard Reedy',
  'Robert Arteaga',
  'Robert Trease',
  'Robert Twigg',
  'Rochelle Dillard',
  'Ronald Strand',
  'Russell Parsons',
  'Ryan Huff',
  'Samuel Buckley',
  'Sarah Kelly',
  'Sean Lamar',
  'Sean Robinson',
  'Sequoia Burgess',

  // Page 6 (S-Y)
  'Shelby Crist',
  'Sherita Brown',
  'Sherri Finegan-Todd',
  'Shon Strickland',
  'Sierra Steele',
  'Simon Burbridge',
  'Sophia Sawyerr',
  'Stanley Jones',
  'Stephen Anderson',
  'Stephen Fouch',
  'Steve Stotts',
  'Tamara Watson',
  'Tarron Scott',
  'Taylor Azbell',
  'Teddye Williams',
  'Theodore Sawyerr',
  'Tiffany Jordan',
  'Timothy Dodley',
  'Timothy Loesch',
  'Timothy Wolinski',
  'Toryn Daniels Jackson',
  'Travis Hall',
  'Tyler Dawson',
  'Uche Orso',
  'Ursline Cheeks',
  'Victor Layne Ii',
  'William Baker',
  'William Francis',
  'William Sweitzer',
  'Xavier Wisher',
  'Yahy Alabyadh',
];

async function main() {
  console.log(`Seeding ${managers.length} managers and ${employees.length} employees...`);

  let created = 0;
  let skipped = 0;

  // Create managers
  for (const name of managers) {
    const existing = await prisma.user.findFirst({ where: { name } });
    if (existing) {
      console.log(`  SKIP (exists): ${name}`);
      skipped++;
      continue;
    }
    await prisma.user.create({
      data: {
        name,
        role: 'MANAGER',
        accessLevel: 'OP_LEAD',
        workSchedule: 'MON_FRI',
        isActive: true,
      },
    });
    console.log(`  CREATED manager: ${name}`);
    created++;
  }

  // Create employees (default to DRIVER role, EMPLOYEE access, MON_FRI schedule)
  for (const name of employees) {
    const existing = await prisma.user.findFirst({ where: { name } });
    if (existing) {
      console.log(`  SKIP (exists): ${name}`);
      skipped++;
      continue;
    }
    await prisma.user.create({
      data: {
        name,
        role: 'DRIVER',
        accessLevel: 'EMPLOYEE',
        workSchedule: 'MON_FRI',
        isActive: true,
      },
    });
    created++;
  }

  console.log(`\nDone! Created: ${created}, Skipped: ${skipped}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
