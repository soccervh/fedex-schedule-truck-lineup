import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient({
  accelerateUrl: process.env.DATABASE_URL,
});

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

  // Create admin manager user
  const hashedPassword = await bcrypt.hash('admin123', 10);
  await prisma.user.create({
    data: {
      email: 'admin@fedex.com',
      password: hashedPassword,
      name: 'Admin Manager',
      role: 'MANAGER',
      homeArea: 'BELT',
    },
  });

  console.log('Created admin user (email: admin@fedex.com, password: admin123)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
