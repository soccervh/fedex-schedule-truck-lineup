import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

async function main() {
  // Create 4 belts with 32 spots each
  const belts = [
    { id: 1, name: 'A Belt', letter: 'A', baseNumber: 100 },
    { id: 2, name: 'B Belt', letter: 'B', baseNumber: 200 },
    { id: 3, name: 'C Belt', letter: 'C', baseNumber: 300 },
    { id: 4, name: 'D Belt', letter: 'D', baseNumber: 400 },
  ];

  for (const belt of belts) {
    await prisma.belt.create({
      data: {
        id: belt.id,
        name: belt.name,
        letter: belt.letter,
        baseNumber: belt.baseNumber,
        spots: {
          create: Array.from({ length: 32 }, (_, i) => ({
            number: i + 1,
          })),
        },
      },
    });
  }

  console.log('Seeded 4 belts with 32 spots each');

  // Create facility areas: UNLOAD and DOC
  // UNLOAD - D/C Side (3 spots)
  const unloadDC = await prisma.facilityArea.create({
    data: {
      name: 'UNLOAD',
      subArea: 'D/C Side',
      spots: {
        create: [
          { number: 1, side: 'DC' },
          { number: 2, side: 'DC' },
          { number: 3, side: 'DC' },
        ],
      },
    },
  });

  // UNLOAD - B/A Side (3 spots)
  const unloadBA = await prisma.facilityArea.create({
    data: {
      name: 'UNLOAD',
      subArea: 'B/A Side',
      spots: {
        create: [
          { number: 4, side: 'BA' },
          { number: 5, side: 'BA' },
          { number: 6, side: 'BA' },
        ],
      },
    },
  });

  console.log('Seeded UNLOAD areas (6 spots total)');

  // DOC - Secondary (8 spots, numbered 8 down to 1)
  const docSecondary = await prisma.facilityArea.create({
    data: {
      name: 'DOC',
      subArea: 'Secondary',
      spots: {
        create: Array.from({ length: 8 }, (_, i) => ({
          number: 8 - i,
          label: `S${8 - i}`,
        })),
      },
    },
  });

  // DOC - Quarterback Upper (2 spots)
  const docQBUpper = await prisma.facilityArea.create({
    data: {
      name: 'DOC',
      subArea: 'Quarterback Upper',
      spots: {
        create: [
          { number: 1, label: 'QB1' },
          { number: 2, label: 'QB2' },
        ],
      },
    },
  });

  // DOC - Fine Sort (8 spots, numbered 1-8)
  const docFineSort = await prisma.facilityArea.create({
    data: {
      name: 'DOC',
      subArea: 'Fine Sort',
      spots: {
        create: Array.from({ length: 8 }, (_, i) => ({
          number: i + 1,
          label: `FS${i + 1}`,
        })),
      },
    },
  });

  // DOC - Quarterback Lower + Ramps (1 QB + 2 Ramps)
  const docQBLower = await prisma.facilityArea.create({
    data: {
      name: 'DOC',
      subArea: 'Quarterback Lower',
      spots: {
        create: [
          { number: 1, label: 'QB1' },
          { number: 2, label: 'Ramp1' },
          { number: 3, label: 'Ramp2' },
        ],
      },
    },
  });

  console.log('Seeded DOC areas (21 spots total)');

  // FO - 20 spots (in the center between belt groups)
  await prisma.facilityArea.create({
    data: {
      name: 'FO',
      subArea: null,
      spots: {
        create: Array.from({ length: 20 }, (_, i) => ({
          number: i + 1,
          label: `FO${i + 1}`,
        })),
      },
    },
  });

  console.log('Seeded FO area (20 spots)');

  // Create admin manager user
  const hashedPassword = await bcrypt.hash('admin123', 10);
  await prisma.user.create({
    data: {
      email: 'admin@fedex.com',
      password: hashedPassword,
      name: 'Admin Manager',
      role: 'MANAGER',
      homeArea: 'FO',
    },
  });

  console.log('Created admin user (email: admin@fedex.com, password: admin123)');

  // Create sample trucks
  const trucks = [
    { number: 'T101', status: 'AVAILABLE' as const },
    { number: 'T102', status: 'AVAILABLE' as const },
    { number: 'T103', status: 'AVAILABLE' as const },
    { number: 'T104', status: 'ASSIGNED' as const },
    { number: 'T105', status: 'ASSIGNED' as const },
    { number: 'T106', status: 'OUT_OF_SERVICE' as const, note: 'Engine repair' },
    { number: 'T107', status: 'OUT_OF_SERVICE' as const, note: 'Brake issue' },
    { number: 'T201', status: 'AVAILABLE' as const },
    { number: 'T202', status: 'ASSIGNED' as const },
    { number: 'T203', status: 'AVAILABLE' as const },
  ];

  for (const truck of trucks) {
    await prisma.truck.create({ data: truck });
  }

  console.log('Seeded 10 trucks');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
