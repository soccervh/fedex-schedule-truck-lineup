import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const managerAssignments: Record<string, string[]> = {
  'Delaney Rotterman': [
    'Anthony Shaw', 'Bradford Davis', 'Brian Butsko', 'Christopher Kette',
    'Deneen Hunold', 'Denise Marshall', 'Donald Kinkead', 'Douglas Metcalf',
    'Frederick Wheeler', 'James Malebranche', 'Jason Lorenz', 'Joey Spencer',
    'John Mcdevitt', 'Juanita Braughton', 'Kelly Ward', 'Marlon Martinez Reyes',
    'Matt Ream', 'Mitchell Brown', 'Rachel Forrest', 'Richard Anderson',
    'Richard Reedy', 'Robert Trease', 'Ronald Strand', 'Sarah Kelly',
    'Shelby Crist', 'Sherri Finegan-Todd', 'Sophia Sawyerr', 'Taylor Azbell',
    'Timothy Wolinski', 'Toryn Daniels Jackson', 'William Sweitzer',
  ],
  'Donte Allen': [
    'Adrienne Shannon', 'Alexis Shuler', 'Alissa Fleming', 'Andrew Mazhindu',
    'Anthony Mcclendon', 'Cassandra Davis', 'Cecilia Donkor', 'Clifford Williams',
    'Donald Galloway', 'Elaine Farmer', 'Elijah Bennett', 'Gary Hudecek',
    'Hani Alabndi', 'Jermaine Prysock', 'Jesse Walton', 'Jonathan Frage',
    'Joshua Moeller', 'Karen Mccann', 'Kemmon Duggleby', 'Kenya Miller',
    'Kimani Warren', 'Michael Marks', 'Nathan Ritchie', 'Olawale Akinpelu',
    'Oscar Dorris', 'Samuel Buckley', 'Sherita Brown', 'Shon Strickland',
    'Simon Burbridge', 'Stephen Anderson', 'Theodore Sawyerr', 'Timothy Dodley',
    'William Francis', 'Xavier Wisher',
  ],
  'Julee Mcdevitt': [
    'Aaron Carr', 'Aja Sorrells', 'Anthony Hines', 'Ari Gabel', 'Audrie Lowe',
    'Beth Nelson Planck', 'Bradley Azbell', 'Brian Davis', 'Carley Hamdi',
    'Cheick Fofana', 'Christian Guzman Jimenez', 'Christine Hubbard',
    'Cole Sparks', 'Daniel Jones', 'Daniel Mosley', 'Daniel Strohacker',
    'Don Milnor', 'Donald Ferguson', 'Eric Schutte', 'Greg Moeller',
    'Hunter Williams', 'Jacob Fenik', 'James Mason', 'Jennifer Warren',
    'Jose Vazquez', 'Kenneth Inyamah', 'Kevin Latham', 'Krista Marinacci',
    'Markus Burton', 'Matthew Burress', 'Matthew Hoffman', 'Michael Christman',
    'Michael Sprankle', 'Nakiyah B.', 'Omar Mcwhorter', 'Patrick Whitlatch',
    'Tiffany Jordan', 'Timothy Loesch', 'Tyler Dawson', 'Uche Orso',
    'Yahy Alabyadh',
  ],
  'Kory Sharp': [
    'Aminah Ali', 'Brenden Lisk', 'Cameron Colombini', 'Charles Romero',
    'Christopher Mcewen', 'Daniel Green', 'Darrell Miller', 'David Leri',
    'Dennis Irwin', 'Devon Peck', 'Dwight Aubrey', 'George Chatters',
    'Hollis Woods', 'James Brake', 'James Styers', 'Jarrod Craft',
    'Jordan Moore', 'Joseph Bennett', 'Laquan Latham', 'Larae Jackson',
    'Latala Mcneal', 'Laurence Hartman', 'Lisandro Hernandez',
    'Maximilian Cooper', 'Michael Scarberry', 'Nicholas Mundy', 'Randy Towns',
    'William Baker',
  ],
  'Kyle Morrison': [
    'Amy Yeagley', 'Angela Moss', 'Anthony Fortner', 'Aujanique Smith',
    'Brittany Hill', 'Bryan Bunch', 'David Doppes', 'Doug Robinson',
    'Dylan Armstrong', 'Eddye Williams', 'Eric Collins', 'Francine Barr',
    'Gregory Smith', 'Isaiah Ware', 'Jeremy Lett', 'Kelly Piper',
    'Kevin Ackley', 'Matthew Underwood', 'Michael Kelly', 'Michael Sherman',
    'Michael Wright', 'Rachel Loos', 'Rahsaun Ferguson', 'Real Comfort',
    'Richard Carney', 'Robert Twigg', 'Russell Parsons', 'Ryan Huff',
    'Sean Lamar', 'Stephen Fouch', 'Teddye Williams', 'Victor Layne Ii',
  ],
  'Thomas Cahill': [
    'Abdelali Benlemlih', 'Amal Ahmed', 'Amy Corkins', 'Briana Wise',
    'Christian Hall', 'Daniel Fann', 'Danielle Peaks', 'Eric Baughman',
    'Evan Law', 'Germaney Johnson', 'Jaylynn Hudson', 'Jonathan Epling',
    'Justin Pope', 'Michael Richards', 'Michael Smith', 'Mickey Jenkins',
    'Otho Ball', 'Ralph Keels', 'Travis Hall',
  ],
  'Christopher Hackett': [
    'Abdalla Ahmed', 'Andrew Castle', 'Dasulise Point Du Jour',
    'Diamond Graham', 'Ursline Cheeks',
  ],
};

function normalize(name: string): string {
  return name.toLowerCase().replace(/[^a-z ]/g, '').replace(/\s+/g, ' ').trim();
}

async function main() {
  const allUsers = await prisma.user.findMany({ where: { isActive: true } });

  let updated = 0;
  let notFoundList: string[] = [];
  let managerNotFound: string[] = [];

  for (const [managerName, employees] of Object.entries(managerAssignments)) {
    // Find manager
    const managerNorm = normalize(managerName);
    const manager = allUsers.find(u => normalize(u.name) === managerNorm);
    if (!manager) {
      managerNotFound.push(managerName);
      continue;
    }
    console.log(`\n=== ${manager.name} (${manager.id}) ===`);

    for (const empName of employees) {
      const empNorm = normalize(empName);
      // Try exact match first, then fuzzy
      let emp = allUsers.find(u => normalize(u.name) === empNorm);
      if (!emp) {
        // Try partial match - last name + first initial
        const parts = empNorm.split(' ');
        const lastName = parts[parts.length - 1];
        emp = allUsers.find(u => {
          const un = normalize(u.name);
          return un.endsWith(` ${lastName}`) && un[0] === empNorm[0];
        });
      }
      if (!emp) {
        // Try just last name if unique
        const parts = empNorm.split(' ');
        const lastName = parts[parts.length - 1];
        const matches = allUsers.filter(u => normalize(u.name).endsWith(` ${lastName}`));
        if (matches.length === 1) emp = matches[0];
      }
      if (!emp) {
        // Try contains for hyphenated or partial names
        emp = allUsers.find(u => normalize(u.name).includes(empNorm) || empNorm.includes(normalize(u.name)));
      }

      if (!emp) {
        notFoundList.push(`${empName} (under ${managerName})`);
        continue;
      }

      if (emp.managerId !== manager.id) {
        await prisma.user.update({
          where: { id: emp.id },
          data: { managerId: manager.id },
        });
        console.log(`  ✓ ${emp.name} → managerId set`);
        updated++;
      } else {
        console.log(`  • ${emp.name} already assigned`);
      }
    }
  }

  console.log(`\n=== SUMMARY ===`);
  console.log(`Updated: ${updated}`);

  if (managerNotFound.length) {
    console.log(`\nManagers not found: ${managerNotFound.join(', ')}`);
  }
  if (notFoundList.length) {
    console.log(`\nEmployees not found:`);
    notFoundList.forEach(n => console.log(`  ✗ ${n}`));
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); await pool.end(); });
