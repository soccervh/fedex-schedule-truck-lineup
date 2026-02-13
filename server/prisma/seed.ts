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

  // SORT - B/A Side (2 Label Facers, 2 Scanners, 2 Splitters)
  await prisma.facilityArea.create({
    data: {
      name: 'SORT',
      subArea: 'B/A Side',
      spots: {
        create: [
          { number: 1, label: 'LF1', side: 'BA' },
          { number: 2, label: 'LF2', side: 'BA' },
          { number: 3, label: 'SC1', side: 'BA' },
          { number: 4, label: 'SC2', side: 'BA' },
          { number: 5, label: 'SP1', side: 'BA' },
          { number: 6, label: 'SP2', side: 'BA' },
        ],
      },
    },
  });

  // SORT - D/C Side (1 Label Facer, 2 Scanners, 2 Splitters)
  await prisma.facilityArea.create({
    data: {
      name: 'SORT',
      subArea: 'D/C Side',
      spots: {
        create: [
          { number: 1, label: 'LF1', side: 'DC' },
          { number: 2, label: 'SC1', side: 'DC' },
          { number: 3, label: 'SC2', side: 'DC' },
          { number: 4, label: 'SP1', side: 'DC' },
          { number: 5, label: 'SP2', side: 'DC' },
        ],
      },
    },
  });

  console.log('Seeded SORT areas (11 spots total)');

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
          { number: 1, label: 'QB3' },
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

  // Create drivers (FO home area - belt drivers)
  const driverNames = [
    'Mike Johnson', 'Steve Williams', 'Dave Brown', 'Tom Davis', 'Chris Miller',
    'James Wilson', 'Robert Moore', 'John Taylor', 'Rick Anderson', 'Dan Thomas',
    'Matt Jackson', 'Kevin White', 'Brian Harris', 'Jeff Martin', 'Scott Garcia',
    'Mark Martinez', 'Paul Robinson', 'Eric Clark', 'Greg Rodriguez', 'Tim Lewis',
    'Jason Lee', 'Ryan Walker', 'Josh Hall', 'Andy Allen', 'Nick Young',
    'Tony Hernandez', 'Joe King', 'Frank Wright', 'Sam Lopez', 'Ben Hill',
    'Larry Scott', 'Carl Green', 'Ray Adams', 'Don Baker', 'Phil Nelson',
    'Wayne Carter', 'Dale Mitchell', 'Roger Perez', 'Keith Roberts', 'Ralph Turner',
    'Roy Phillips', 'Eugene Campbell', 'Russell Parker', 'Louis Evans', 'Harry Edwards',
    'Fred Collins', 'Albert Stewart', 'Howard Sanchez', 'Victor Morris', 'Ernest Rogers',
    'Jesse Reed', 'Arthur Cook', 'Leonard Morgan', 'Oscar Bell', 'Martin Murphy',
    'Tommy Bailey', 'Gerald Rivera', 'Herbert Cooper', 'Floyd Richardson', 'Lloyd Cox',
    'Clyde Howard', 'Glen Ward', 'Dean Torres', 'Norman Peterson', 'Alfred Gray',
    'Leo Ramirez', 'Leroy James', 'Elmer Watson', 'Floyd Brooks', 'Cecil Kelly',
    'Clarence Sanders', 'Vernon Price', 'Edgar Bennett', 'Milton Wood', 'Claude Barnes',
    'Lester Ross', 'Melvin Henderson', 'Clifford Coleman', 'Edgar Jenkins', 'Max Perry',
    'Hugh Powell', 'Willis Long', 'Homer Patterson', 'Sherman Hughes', 'Virgil Flores',
    'Horace Washington', 'Edmund Butler', 'Felix Simmons', 'Stuart Foster', 'Harvey Gonzales',
    'Gordon Bryant', 'Sidney Alexander', 'Wilbur Russell', 'Morris Griffin', 'Gilbert Diaz',
    'Roland Hayes', 'Irving Myers', 'Forrest Ford', 'Chester Hamilton', 'Rudolph Graham',
    'Dewey Sullivan', 'Irving Wallace', 'Archie West', 'Roman Cole', 'Otis Lucas',
    'Emmett Owens', 'Grover Burns', 'Rufus Stone', 'Alonzo Gordon', 'Conrad Hart',
    'Luther Fox', 'Isaac Palmer', 'Boris Weber', 'Jasper Kelley', 'Herman Sanders',
    'Elbert Newman', 'Myron Rhodes', 'Oliver Nichols', 'Marshall Dixon', 'Percy Hunt',
  ];

  // Distribute drivers across secondary roles
  const driverAreas: Array<'FO' | 'DOC' | 'UNLOAD' | 'PULLER'> = [];
  for (let i = 0; i < driverNames.length; i++) {
    if (i < 70) driverAreas.push('FO');
    else if (i < 90) driverAreas.push('DOC');
    else if (i < 105) driverAreas.push('UNLOAD');
    else driverAreas.push('PULLER');
  }

  const drivers: { id: string }[] = [];
  for (let i = 0; i < driverNames.length; i++) {
    const driver = await prisma.user.create({
      data: {
        email: `driver${i + 1}@fedex.com`,
        password: hashedPassword,
        name: driverNames[i],
        role: 'DRIVER',
        homeArea: driverAreas[i],
      },
    });
    drivers.push(driver);
  }
  console.log(`Created ${drivers.length} drivers`);

  // Create swing drivers with varied secondary roles
  const swingNames = [
    'Carlos Mendez', 'Derek Shaw', 'Eddie Cruz', 'Felix Ortiz',
    'Hank Reeves', 'Ivan Wolfe', 'Jake Dunn', 'Kyle Bates',
  ];
  const swingAreas: Array<'FO' | 'DOC' | 'UNLOAD' | 'PULLER'> = [
    'FO', 'FO', 'DOC', 'DOC', 'UNLOAD', 'UNLOAD', 'PULLER', 'FO',
  ];
  const swingDrivers: { id: string }[] = [];
  for (let i = 0; i < swingNames.length; i++) {
    const swing = await prisma.user.create({
      data: {
        email: `swing${i + 1}@fedex.com`,
        password: hashedPassword,
        name: swingNames[i],
        role: 'SWING',
        homeArea: swingAreas[i],
      },
    });
    swingDrivers.push(swing);
  }
  console.log(`Created ${swingDrivers.length} swing drivers`);

  // Create CSA users
  const csaNames = ['Lisa Chen', 'Maria Gonzalez', 'Sarah Kim'];
  for (let i = 0; i < csaNames.length; i++) {
    await prisma.user.create({
      data: {
        email: `csa${i + 1}@fedex.com`,
        password: hashedPassword,
        name: csaNames[i],
        role: 'CSA',
        homeArea: 'UNASSIGNED',
      },
    });
  }
  console.log(`Created ${csaNames.length} CSA users`);

  // Create Handler users
  const handlerNames = ['Pete Marshall', 'Vince Torres', 'Will Chambers', 'Alex Duran'];
  const handlerAreas: Array<'UNLOAD' | 'UNASSIGNED'> = ['UNLOAD', 'UNLOAD', 'UNASSIGNED', 'UNASSIGNED'];
  for (let i = 0; i < handlerNames.length; i++) {
    await prisma.user.create({
      data: {
        email: `handler${i + 1}@fedex.com`,
        password: hashedPassword,
        name: handlerNames[i],
        role: 'HANDLER',
        homeArea: handlerAreas[i],
      },
    });
  }
  console.log(`Created ${handlerNames.length} Handler users`);

  // Assign drivers to belt spots for today
  // Use the same date creation as the API: parse from date string = UTC midnight
  const todayStr = new Date().toISOString().split('T')[0];
  const today = new Date(todayStr);

  const allSpots = await prisma.spot.findMany({
    orderBy: [{ beltId: 'asc' }, { number: 'asc' }],
  });

  // Assign 120 of 128 spots (leave 8 unassigned, 2 per belt)
  let driverIndex = 0;
  for (let i = 0; i < allSpots.length; i++) {
    // Skip spots 31 and 32 on each belt (leave them empty)
    const spotNumber = allSpots[i].number;
    if (spotNumber >= 31) continue;

    if (driverIndex >= drivers.length) break;

    await prisma.assignment.create({
      data: {
        spotId: allSpots[i].id,
        userId: drivers[driverIndex].id,
        date: today,
        truckNumber: '',
      },
    });
    driverIndex++;
  }
  console.log(`Created ${driverIndex} assignments for today`);

  // Add a few time-off entries so some assigned people show as needing coverage
  const timeOffDrivers = drivers.slice(0, 5); // First 5 drivers
  for (const driver of timeOffDrivers) {
    await prisma.timeOff.create({
      data: {
        userId: driver.id,
        date: today,
        type: 'SCHEDULED_OFF',
        status: 'APPROVED',
      },
    });
  }
  console.log(`Created ${timeOffDrivers.length} time-off entries for today`);

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
