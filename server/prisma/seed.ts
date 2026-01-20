import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create 4 belts with 32 spots each
  for (let beltNum = 1; beltNum <= 4; beltNum++) {
    await prisma.belt.create({
      data: {
        id: beltNum,
        name: `Belt ${beltNum}`,
        spots: {
          create: Array.from({ length: 32 }, (_, i) => ({
            number: i + 1,
          })),
        },
      },
    });
  }

  console.log('Seeded 4 belts with 32 spots each');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
