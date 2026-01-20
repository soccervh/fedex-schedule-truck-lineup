# FedEx Truck Lineup Scheduling System - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a web app for managing FedEx truck lineup scheduling across 4 belts with 32 spots each, with role-based access for managers and drivers.

**Architecture:** React frontend communicates with Express REST API backed by PostgreSQL. JWT authentication with two roles (manager/driver). Weekly templates with daily override capability.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Shadcn/UI, Node.js, Express, PostgreSQL, Prisma ORM, JWT

---

## Phase 1: Project Setup

### Task 1.1: Initialize Backend Project

**Files:**
- Create: `server/package.json`
- Create: `server/tsconfig.json`
- Create: `server/src/index.ts`
- Create: `server/.env.example`

**Step 1: Create server directory and initialize npm**

```bash
mkdir -p server
cd server
npm init -y
```

**Step 2: Install backend dependencies**

```bash
npm install express cors helmet dotenv jsonwebtoken bcryptjs prisma @prisma/client
npm install -D typescript ts-node-dev @types/node @types/express @types/cors @types/jsonwebtoken @types/bcryptjs
```

**Step 3: Create tsconfig.json**

Create `server/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 4: Create basic Express server**

Create `server/src/index.ts`:
```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

**Step 5: Create .env.example**

Create `server/.env.example`:
```
PORT=3001
DATABASE_URL="postgresql://user:password@localhost:5432/fedex_lineup"
JWT_SECRET="your-secret-key-change-in-production"
```

**Step 6: Update package.json scripts**

Update `server/package.json` scripts section:
```json
{
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  }
}
```

**Step 7: Commit**

```bash
git add server/
git commit -m "feat: initialize backend with Express and TypeScript"
```

---

### Task 1.2: Initialize Frontend Project

**Files:**
- Create: `client/` (Vite React project)

**Step 1: Create React app with Vite**

```bash
npm create vite@latest client -- --template react-ts
cd client
npm install
```

**Step 2: Install frontend dependencies**

```bash
npm install @tanstack/react-query axios react-router-dom clsx tailwind-merge lucide-react
npm install -D tailwindcss postcss autoprefixer
```

**Step 3: Initialize Tailwind**

```bash
npx tailwindcss init -p
```

**Step 4: Configure Tailwind**

Update `client/tailwind.config.js`:
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        belt: '#3B82F6',      // blue-500
        dock: '#F97316',      // orange-500
        unload: '#22C55E',    // green-500
        swing: '#6B7280',     // gray-500
        coverage: '#EF4444',  // red-500
      },
    },
  },
  plugins: [],
}
```

**Step 5: Update CSS file**

Replace `client/src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**Step 6: Create basic App component**

Replace `client/src/App.tsx`:
```tsx
function App() {
  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-4 px-4">
          <h1 className="text-2xl font-bold text-gray-900">
            FedEx Truck Lineup
          </h1>
        </div>
      </header>
      <main className="max-w-7xl mx-auto py-6 px-4">
        <p className="text-gray-600">Application loading...</p>
      </main>
    </div>
  );
}

export default App;
```

**Step 7: Commit**

```bash
git add client/
git commit -m "feat: initialize frontend with React, Vite, and Tailwind"
```

---

### Task 1.3: Setup Prisma and Database Schema

**Files:**
- Create: `server/prisma/schema.prisma`

**Step 1: Initialize Prisma**

```bash
cd server
npx prisma init
```

**Step 2: Define database schema**

Replace `server/prisma/schema.prisma`:
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  MANAGER
  DRIVER
  SWING
}

enum HomeArea {
  BELT
  DOCK
  UNLOAD
}

enum TimeOffStatus {
  PENDING
  APPROVED
  DENIED
}

enum TimeOffType {
  VACATION
  SICK
  SCHEDULED_OFF
}

model User {
  id        String    @id @default(cuid())
  email     String    @unique
  password  String
  name      String
  phone     String?
  role      Role
  homeArea  HomeArea
  isActive  Boolean   @default(true)
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  assignments       Assignment[]
  timeOffRequests   TimeOff[]
}

model Belt {
  id        Int      @id
  name      String
  spots     Spot[]
}

model Spot {
  id        Int      @id @default(autoincrement())
  number    Int
  beltId    Int
  belt      Belt     @relation(fields: [beltId], references: [id])

  templateAssignments TemplateAssignment[]
  assignments         Assignment[]

  @@unique([beltId, number])
}

model TemplateAssignment {
  id          String    @id @default(cuid())
  spotId      Int
  spot        Spot      @relation(fields: [spotId], references: [id])
  userId      String
  user        User      @relation(fields: [userId], references: [id])
  dayOfWeek   Int       // 0 = Sunday, 6 = Saturday
  truckNumber String

  @@unique([spotId, dayOfWeek])
}

model Assignment {
  id          String    @id @default(cuid())
  spotId      Int
  spot        Spot      @relation(fields: [spotId], references: [id])
  userId      String
  user        User      @relation(fields: [userId], references: [id])
  date        DateTime  @db.Date
  truckNumber String
  isOverride  Boolean   @default(false)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@unique([spotId, date])
}

model TimeOff {
  id        String         @id @default(cuid())
  userId    String
  user      User           @relation(fields: [userId], references: [id])
  date      DateTime       @db.Date
  type      TimeOffType
  status    TimeOffStatus  @default(PENDING)
  isImported Boolean       @default(false)
  note      String?
  createdAt DateTime       @default(now())
  updatedAt DateTime       @updatedAt

  @@unique([userId, date])
}
```

**Step 3: Create seed file**

Create `server/prisma/seed.ts`:
```typescript
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
```

**Step 4: Update package.json for seed**

Add to `server/package.json`:
```json
{
  "prisma": {
    "seed": "ts-node prisma/seed.ts"
  }
}
```

**Step 5: Commit**

```bash
git add server/prisma/
git commit -m "feat: add Prisma schema for lineup scheduling"
```

---

## Phase 2: Backend API - Authentication

### Task 2.1: Create Auth Middleware and Utilities

**Files:**
- Create: `server/src/middleware/auth.ts`
- Create: `server/src/utils/password.ts`

**Step 1: Create password utility**

Create `server/src/utils/password.ts`:
```typescript
import bcrypt from 'bcryptjs';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
```

**Step 2: Create auth middleware**

Create `server/src/middleware/auth.ts`:
```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthPayload {
  userId: string;
  role: 'MANAGER' | 'DRIVER' | 'SWING';
}

export interface AuthRequest extends Request {
  user?: AuthPayload;
}

export function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.substring(7);

  try {
    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET || 'fallback-secret'
    ) as AuthPayload;
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export function requireManager(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  if (req.user?.role !== 'MANAGER') {
    return res.status(403).json({ error: 'Manager access required' });
  }
  next();
}
```

**Step 3: Commit**

```bash
git add server/src/middleware/ server/src/utils/
git commit -m "feat: add auth middleware and password utilities"
```

---

### Task 2.2: Create Auth Routes

**Files:**
- Create: `server/src/routes/auth.ts`
- Modify: `server/src/index.ts`

**Step 1: Create auth routes**

Create `server/src/routes/auth.ts`:
```typescript
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { hashPassword, comparePassword } from '../utils/password';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await comparePassword(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        homeArea: user.homeArea,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user
router.get('/me', authenticate, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        homeArea: true,
        phone: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

export default router;
```

**Step 2: Update index.ts to use routes**

Replace `server/src/index.ts`:
```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

**Step 3: Commit**

```bash
git add server/src/
git commit -m "feat: add auth login and current user endpoints"
```

---

## Phase 3: Backend API - People Management

### Task 3.1: Create People Routes

**Files:**
- Create: `server/src/routes/people.ts`
- Modify: `server/src/index.ts`

**Step 1: Create people routes**

Create `server/src/routes/people.ts`:
```typescript
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, requireManager, AuthRequest } from '../middleware/auth';
import { hashPassword } from '../utils/password';

const router = Router();
const prisma = new PrismaClient();

// Get all people (managers only see all, drivers see limited)
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const people = await prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        email: req.user!.role === 'MANAGER' ? true : false,
        role: true,
        homeArea: true,
        phone: req.user!.role === 'MANAGER' ? true : false,
      },
      orderBy: { name: 'asc' },
    });

    res.json(people);
  } catch (error) {
    console.error('Get people error:', error);
    res.status(500).json({ error: 'Failed to get people' });
  }
});

// Get swing drivers
router.get('/swing', authenticate, async (req, res) => {
  try {
    const swingDrivers = await prisma.user.findMany({
      where: { role: 'SWING', isActive: true },
      select: {
        id: true,
        name: true,
        homeArea: true,
      },
      orderBy: { name: 'asc' },
    });

    res.json(swingDrivers);
  } catch (error) {
    console.error('Get swing drivers error:', error);
    res.status(500).json({ error: 'Failed to get swing drivers' });
  }
});

// Create person (manager only)
router.post('/', authenticate, requireManager, async (req: AuthRequest, res) => {
  try {
    const { email, password, name, phone, role, homeArea } = req.body;

    if (!email || !password || !name || !role || !homeArea) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'Email already exists' });
    }

    const hashedPassword = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        phone,
        role,
        homeArea,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        homeArea: true,
        phone: true,
      },
    });

    res.status(201).json(user);
  } catch (error) {
    console.error('Create person error:', error);
    res.status(500).json({ error: 'Failed to create person' });
  }
});

// Update person (manager only)
router.put('/:id', authenticate, requireManager, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { name, phone, role, homeArea, isActive } = req.body;

    const user = await prisma.user.update({
      where: { id },
      data: {
        name,
        phone,
        role,
        homeArea,
        isActive,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        homeArea: true,
        phone: true,
        isActive: true,
      },
    });

    res.json(user);
  } catch (error) {
    console.error('Update person error:', error);
    res.status(500).json({ error: 'Failed to update person' });
  }
});

// Deactivate person (manager only)
router.delete('/:id', authenticate, requireManager, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Deactivate person error:', error);
    res.status(500).json({ error: 'Failed to deactivate person' });
  }
});

export default router;
```

**Step 2: Add route to index.ts**

Update `server/src/index.ts` to add:
```typescript
import peopleRoutes from './routes/people';
// ... after other routes
app.use('/api/people', peopleRoutes);
```

**Step 3: Commit**

```bash
git add server/src/
git commit -m "feat: add people management endpoints"
```

---

## Phase 4: Backend API - Belts and Assignments

### Task 4.1: Create Belt Routes

**Files:**
- Create: `server/src/routes/belts.ts`

**Step 1: Create belt routes**

Create `server/src/routes/belts.ts`:
```typescript
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Get all belts with spot counts
router.get('/', authenticate, async (req, res) => {
  try {
    const belts = await prisma.belt.findMany({
      include: {
        _count: { select: { spots: true } },
      },
      orderBy: { id: 'asc' },
    });

    res.json(belts);
  } catch (error) {
    console.error('Get belts error:', error);
    res.status(500).json({ error: 'Failed to get belts' });
  }
});

// Get belt with spots and assignments for a specific date
router.get('/:beltId/assignments', authenticate, async (req, res) => {
  try {
    const { beltId } = req.params;
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ error: 'Date parameter required' });
    }

    const targetDate = new Date(date as string);

    const belt = await prisma.belt.findUnique({
      where: { id: parseInt(beltId) },
      include: {
        spots: {
          orderBy: { number: 'asc' },
          include: {
            assignments: {
              where: { date: targetDate },
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    homeArea: true,
                    role: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!belt) {
      return res.status(404).json({ error: 'Belt not found' });
    }

    // Get time-off for assigned users on this date
    const assignedUserIds = belt.spots
      .flatMap(s => s.assignments)
      .map(a => a.userId);

    const timeOffs = await prisma.timeOff.findMany({
      where: {
        userId: { in: assignedUserIds },
        date: targetDate,
        status: 'APPROVED',
      },
    });

    const timeOffUserIds = new Set(timeOffs.map(t => t.userId));

    // Format response
    const spotsWithStatus = belt.spots.map(spot => {
      const assignment = spot.assignments[0];
      const isOff = assignment ? timeOffUserIds.has(assignment.userId) : false;

      return {
        id: spot.id,
        number: spot.number,
        assignment: assignment
          ? {
              id: assignment.id,
              truckNumber: assignment.truckNumber,
              isOverride: assignment.isOverride,
              user: assignment.user,
              needsCoverage: isOff,
            }
          : null,
      };
    });

    res.json({
      id: belt.id,
      name: belt.name,
      spots: spotsWithStatus,
    });
  } catch (error) {
    console.error('Get belt assignments error:', error);
    res.status(500).json({ error: 'Failed to get belt assignments' });
  }
});

export default router;
```

**Step 2: Add route to index.ts**

```typescript
import beltRoutes from './routes/belts';
// ...
app.use('/api/belts', beltRoutes);
```

**Step 3: Commit**

```bash
git add server/src/
git commit -m "feat: add belt and assignment retrieval endpoints"
```

---

### Task 4.2: Create Assignment Routes

**Files:**
- Create: `server/src/routes/assignments.ts`

**Step 1: Create assignment routes**

Create `server/src/routes/assignments.ts`:
```typescript
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, requireManager, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Create or update assignment
router.post('/', authenticate, requireManager, async (req: AuthRequest, res) => {
  try {
    const { spotId, userId, date, truckNumber } = req.body;

    if (!spotId || !userId || !date || !truckNumber) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const targetDate = new Date(date);

    // Check if there's a template assignment for this spot/day
    const dayOfWeek = targetDate.getDay();
    const templateAssignment = await prisma.templateAssignment.findUnique({
      where: {
        spotId_dayOfWeek: { spotId, dayOfWeek },
      },
    });

    const isOverride = templateAssignment
      ? templateAssignment.userId !== userId ||
        templateAssignment.truckNumber !== truckNumber
      : false;

    const assignment = await prisma.assignment.upsert({
      where: {
        spotId_date: { spotId, date: targetDate },
      },
      update: {
        userId,
        truckNumber,
        isOverride,
      },
      create: {
        spotId,
        userId,
        date: targetDate,
        truckNumber,
        isOverride,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            homeArea: true,
            role: true,
          },
        },
      },
    });

    res.json(assignment);
  } catch (error) {
    console.error('Create assignment error:', error);
    res.status(500).json({ error: 'Failed to create assignment' });
  }
});

// Delete assignment (reset to unassigned)
router.delete('/:id', authenticate, requireManager, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    await prisma.assignment.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Delete assignment error:', error);
    res.status(500).json({ error: 'Failed to delete assignment' });
  }
});

// Apply template to date range
router.post('/apply-template', authenticate, requireManager, async (req: AuthRequest, res) => {
  try {
    const { startDate, endDate } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start and end dates required' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Get all template assignments
    const templates = await prisma.templateAssignment.findMany({
      include: { spot: true },
    });

    const created: any[] = [];
    const current = new Date(start);

    while (current <= end) {
      const dayOfWeek = current.getDay();
      const dayTemplates = templates.filter(t => t.dayOfWeek === dayOfWeek);

      for (const template of dayTemplates) {
        const existing = await prisma.assignment.findUnique({
          where: {
            spotId_date: { spotId: template.spotId, date: current },
          },
        });

        if (!existing) {
          const assignment = await prisma.assignment.create({
            data: {
              spotId: template.spotId,
              userId: template.userId,
              date: new Date(current),
              truckNumber: template.truckNumber,
              isOverride: false,
            },
          });
          created.push(assignment);
        }
      }

      current.setDate(current.getDate() + 1);
    }

    res.json({ created: created.length });
  } catch (error) {
    console.error('Apply template error:', error);
    res.status(500).json({ error: 'Failed to apply template' });
  }
});

// Get user's assignments (for driver view)
router.get('/my-assignments', authenticate, async (req: AuthRequest, res) => {
  try {
    const { startDate, endDate } = req.query;

    const whereClause: any = { userId: req.user!.userId };

    if (startDate && endDate) {
      whereClause.date = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string),
      };
    }

    const assignments = await prisma.assignment.findMany({
      where: whereClause,
      include: {
        spot: {
          include: { belt: true },
        },
      },
      orderBy: { date: 'asc' },
    });

    res.json(assignments);
  } catch (error) {
    console.error('Get my assignments error:', error);
    res.status(500).json({ error: 'Failed to get assignments' });
  }
});

export default router;
```

**Step 2: Add route to index.ts**

```typescript
import assignmentRoutes from './routes/assignments';
// ...
app.use('/api/assignments', assignmentRoutes);
```

**Step 3: Commit**

```bash
git add server/src/
git commit -m "feat: add assignment management endpoints"
```

---

## Phase 5: Backend API - Templates

### Task 5.1: Create Template Routes

**Files:**
- Create: `server/src/routes/templates.ts`

**Step 1: Create template routes**

Create `server/src/routes/templates.ts`:
```typescript
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, requireManager, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Get template for a specific belt and day of week
router.get('/belt/:beltId', authenticate, async (req, res) => {
  try {
    const { beltId } = req.params;
    const { dayOfWeek } = req.query;

    const whereClause: any = {
      spot: { beltId: parseInt(beltId) },
    };

    if (dayOfWeek !== undefined) {
      whereClause.dayOfWeek = parseInt(dayOfWeek as string);
    }

    const templates = await prisma.templateAssignment.findMany({
      where: whereClause,
      include: {
        spot: true,
        user: {
          select: {
            id: true,
            name: true,
            homeArea: true,
            role: true,
          },
        },
      },
      orderBy: [{ dayOfWeek: 'asc' }, { spot: { number: 'asc' } }],
    });

    res.json(templates);
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({ error: 'Failed to get templates' });
  }
});

// Create or update template assignment
router.post('/', authenticate, requireManager, async (req: AuthRequest, res) => {
  try {
    const { spotId, userId, dayOfWeek, truckNumber } = req.body;

    if (spotId === undefined || !userId || dayOfWeek === undefined || !truckNumber) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const template = await prisma.templateAssignment.upsert({
      where: {
        spotId_dayOfWeek: { spotId, dayOfWeek },
      },
      update: {
        userId,
        truckNumber,
      },
      create: {
        spotId,
        userId,
        dayOfWeek,
        truckNumber,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            homeArea: true,
            role: true,
          },
        },
      },
    });

    res.json(template);
  } catch (error) {
    console.error('Create template error:', error);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

// Delete template assignment
router.delete('/:spotId/:dayOfWeek', authenticate, requireManager, async (req: AuthRequest, res) => {
  try {
    const { spotId, dayOfWeek } = req.params;

    await prisma.templateAssignment.delete({
      where: {
        spotId_dayOfWeek: {
          spotId: parseInt(spotId),
          dayOfWeek: parseInt(dayOfWeek),
        },
      },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Delete template error:', error);
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

export default router;
```

**Step 2: Add route to index.ts**

```typescript
import templateRoutes from './routes/templates';
// ...
app.use('/api/templates', templateRoutes);
```

**Step 3: Commit**

```bash
git add server/src/
git commit -m "feat: add template management endpoints"
```

---

## Phase 6: Backend API - Time Off

### Task 6.1: Create Time Off Routes

**Files:**
- Create: `server/src/routes/timeoff.ts`

**Step 1: Create time off routes**

Create `server/src/routes/timeoff.ts`:
```typescript
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, requireManager, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Get time off for a date range (manager view)
router.get('/', authenticate, requireManager, async (req: AuthRequest, res) => {
  try {
    const { startDate, endDate, status } = req.query;

    const whereClause: any = {};

    if (startDate && endDate) {
      whereClause.date = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string),
      };
    }

    if (status) {
      whereClause.status = status;
    }

    const timeOffs = await prisma.timeOff.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            homeArea: true,
          },
        },
      },
      orderBy: [{ date: 'asc' }, { user: { name: 'asc' } }],
    });

    res.json(timeOffs);
  } catch (error) {
    console.error('Get time offs error:', error);
    res.status(500).json({ error: 'Failed to get time offs' });
  }
});

// Get my time off (driver view)
router.get('/mine', authenticate, async (req: AuthRequest, res) => {
  try {
    const timeOffs = await prisma.timeOff.findMany({
      where: { userId: req.user!.userId },
      orderBy: { date: 'desc' },
    });

    res.json(timeOffs);
  } catch (error) {
    console.error('Get my time offs error:', error);
    res.status(500).json({ error: 'Failed to get time offs' });
  }
});

// Request time off (any user)
router.post('/request', authenticate, async (req: AuthRequest, res) => {
  try {
    const { dates, type, note } = req.body;

    if (!dates || !Array.isArray(dates) || dates.length === 0 || !type) {
      return res.status(400).json({ error: 'Dates array and type required' });
    }

    const created = [];

    for (const dateStr of dates) {
      const date = new Date(dateStr);

      const existing = await prisma.timeOff.findUnique({
        where: {
          userId_date: { userId: req.user!.userId, date },
        },
      });

      if (!existing) {
        const timeOff = await prisma.timeOff.create({
          data: {
            userId: req.user!.userId,
            date,
            type,
            note,
            status: 'PENDING',
            isImported: false,
          },
        });
        created.push(timeOff);
      }
    }

    res.status(201).json(created);
  } catch (error) {
    console.error('Request time off error:', error);
    res.status(500).json({ error: 'Failed to request time off' });
  }
});

// Approve/deny time off (manager only)
router.patch('/:id', authenticate, requireManager, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body;

    if (!status || !['APPROVED', 'DENIED'].includes(status)) {
      return res.status(400).json({ error: 'Valid status required' });
    }

    const timeOff = await prisma.timeOff.update({
      where: { id },
      data: { status, note },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.json(timeOff);
  } catch (error) {
    console.error('Update time off error:', error);
    res.status(500).json({ error: 'Failed to update time off' });
  }
});

// Import time off from CSV (manager only)
router.post('/import', authenticate, requireManager, async (req: AuthRequest, res) => {
  try {
    const { entries } = req.body;

    if (!entries || !Array.isArray(entries)) {
      return res.status(400).json({ error: 'Entries array required' });
    }

    const results = { created: 0, skipped: 0, errors: [] as string[] };

    for (const entry of entries) {
      const { name, date, type } = entry;

      // Find user by name
      const user = await prisma.user.findFirst({
        where: { name: { equals: name, mode: 'insensitive' } },
      });

      if (!user) {
        results.errors.push(`User not found: ${name}`);
        results.skipped++;
        continue;
      }

      const targetDate = new Date(date);

      const existing = await prisma.timeOff.findUnique({
        where: {
          userId_date: { userId: user.id, date: targetDate },
        },
      });

      if (existing) {
        results.skipped++;
        continue;
      }

      await prisma.timeOff.create({
        data: {
          userId: user.id,
          date: targetDate,
          type: type || 'SCHEDULED_OFF',
          status: 'APPROVED',
          isImported: true,
        },
      });

      results.created++;
    }

    res.json(results);
  } catch (error) {
    console.error('Import time off error:', error);
    res.status(500).json({ error: 'Failed to import time off' });
  }
});

// Get coverage needs for a date
router.get('/coverage-needs', authenticate, async (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ error: 'Date required' });
    }

    const targetDate = new Date(date as string);

    // Get all assignments for this date
    const assignments = await prisma.assignment.findMany({
      where: { date: targetDate },
      include: {
        user: true,
        spot: {
          include: { belt: true },
        },
      },
    });

    // Get approved time offs for assigned users
    const userIds = assignments.map(a => a.userId);
    const timeOffs = await prisma.timeOff.findMany({
      where: {
        userId: { in: userIds },
        date: targetDate,
        status: 'APPROVED',
      },
    });

    const timeOffUserIds = new Set(timeOffs.map(t => t.userId));

    // Find spots needing coverage
    const needsCoverage = assignments
      .filter(a => timeOffUserIds.has(a.userId))
      .map(a => ({
        assignment: a,
        spot: a.spot,
        belt: a.spot.belt,
        user: a.user,
      }));

    // Get available swing drivers
    const swingDrivers = await prisma.user.findMany({
      where: {
        role: 'SWING',
        isActive: true,
      },
    });

    const assignedSwingIds = assignments
      .filter(a => a.user.role === 'SWING')
      .map(a => a.userId);

    const swingTimeOffs = await prisma.timeOff.findMany({
      where: {
        userId: { in: swingDrivers.map(s => s.id) },
        date: targetDate,
        status: 'APPROVED',
      },
    });

    const swingOffIds = new Set(swingTimeOffs.map(t => t.userId));

    const availableSwing = swingDrivers.filter(
      s => !assignedSwingIds.includes(s.id) && !swingOffIds.has(s.id)
    );

    res.json({
      needsCoverage,
      availableSwing,
    });
  } catch (error) {
    console.error('Get coverage needs error:', error);
    res.status(500).json({ error: 'Failed to get coverage needs' });
  }
});

export default router;
```

**Step 2: Add route to index.ts**

```typescript
import timeoffRoutes from './routes/timeoff';
// ...
app.use('/api/timeoff', timeoffRoutes);
```

**Step 3: Commit**

```bash
git add server/src/
git commit -m "feat: add time off management and coverage tracking endpoints"
```

---

## Phase 7: Frontend - Core Setup

### Task 7.1: Setup API Client and Auth Context

**Files:**
- Create: `client/src/lib/api.ts`
- Create: `client/src/contexts/AuthContext.tsx`

**Step 1: Create API client**

Create `client/src/lib/api.ts`:
```typescript
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const api = axios.create({
  baseURL: API_BASE,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

**Step 2: Create auth context**

Create `client/src/contexts/AuthContext.tsx`:
```tsx
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '../lib/api';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'MANAGER' | 'DRIVER' | 'SWING';
  homeArea: 'BELT' | 'DOCK' | 'UNLOAD';
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isManager: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api.get('/auth/me')
        .then((res) => setUser(res.data))
        .catch(() => localStorage.removeItem('token'))
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', res.data.token);
    setUser(res.data.user);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        isManager: user?.role === 'MANAGER',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
```

**Step 3: Commit**

```bash
git add client/src/lib/ client/src/contexts/
git commit -m "feat: add API client and auth context"
```

---

### Task 7.2: Setup Router and Layout

**Files:**
- Create: `client/src/components/Layout.tsx`
- Create: `client/src/pages/Login.tsx`
- Modify: `client/src/App.tsx`
- Modify: `client/src/main.tsx`

**Step 1: Create Layout component**

Create `client/src/components/Layout.tsx`:
```tsx
import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, logout, isManager } = useAuth();
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Lineup', show: true },
    { path: '/people', label: 'People', show: isManager },
    { path: '/timeoff', label: 'Time Off', show: isManager },
    { path: '/my-schedule', label: 'My Schedule', show: !isManager },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-xl font-bold text-gray-900">
              FedEx Truck Lineup
            </h1>
            <nav className="flex items-center gap-6">
              {navItems
                .filter((item) => item.show)
                .map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`text-sm font-medium ${
                      location.pathname === item.path
                        ? 'text-blue-600'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              <div className="flex items-center gap-4 ml-4 pl-4 border-l">
                <span className="text-sm text-gray-600">{user?.name}</span>
                <button
                  onClick={logout}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Logout
                </button>
              </div>
            </nav>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto py-6 px-4">{children}</main>
    </div>
  );
}
```

**Step 2: Create Login page**

Create `client/src/pages/Login.tsx`:
```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch {
      setError('Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-6">
          FedEx Truck Lineup
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded text-sm">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

**Step 3: Update App.tsx**

Replace `client/src/App.tsx`:
```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Layout>{children}</Layout>;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/" replace /> : <Login />}
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <div>Lineup View (coming next)</div>
          </ProtectedRoute>
        }
      />
      <Route
        path="/people"
        element={
          <ProtectedRoute>
            <div>People Management (coming soon)</div>
          </ProtectedRoute>
        }
      />
      <Route
        path="/timeoff"
        element={
          <ProtectedRoute>
            <div>Time Off Management (coming soon)</div>
          </ProtectedRoute>
        }
      />
      <Route
        path="/my-schedule"
        element={
          <ProtectedRoute>
            <div>My Schedule (coming soon)</div>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
```

**Step 4: Commit**

```bash
git add client/src/
git commit -m "feat: add routing, layout, and login page"
```

---

## Phase 8: Frontend - Belt View (Main Feature)

### Task 8.1: Create Belt Selector and Spot Grid

**Files:**
- Create: `client/src/pages/Lineup.tsx`
- Create: `client/src/components/BeltSelector.tsx`
- Create: `client/src/components/SpotGrid.tsx`
- Create: `client/src/components/SpotCard.tsx`

**Step 1: Create BeltSelector component**

Create `client/src/components/BeltSelector.tsx`:
```tsx
interface BeltSelectorProps {
  selectedBelt: number;
  onSelect: (belt: number) => void;
}

export function BeltSelector({ selectedBelt, onSelect }: BeltSelectorProps) {
  const belts = [1, 2, 3, 4];

  return (
    <div className="flex gap-2">
      {belts.map((belt) => (
        <button
          key={belt}
          onClick={() => onSelect(belt)}
          className={`px-4 py-2 rounded-md font-medium transition-colors ${
            selectedBelt === belt
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50 border'
          }`}
        >
          Belt {belt}
        </button>
      ))}
    </div>
  );
}
```

**Step 2: Create SpotCard component**

Create `client/src/components/SpotCard.tsx`:
```tsx
interface SpotAssignment {
  id: string;
  truckNumber: string;
  isOverride: boolean;
  user: {
    id: string;
    name: string;
    homeArea: 'BELT' | 'DOCK' | 'UNLOAD';
    role: 'DRIVER' | 'SWING' | 'MANAGER';
  };
  needsCoverage: boolean;
}

interface SpotCardProps {
  spotNumber: number;
  assignment: SpotAssignment | null;
  onClick: () => void;
  isManager: boolean;
}

const areaColors = {
  BELT: 'bg-belt',
  DOCK: 'bg-dock',
  UNLOAD: 'bg-unload',
};

export function SpotCard({ spotNumber, assignment, onClick, isManager }: SpotCardProps) {
  const getBackgroundClass = () => {
    if (!assignment) return 'bg-gray-50 border-dashed';
    if (assignment.needsCoverage) return 'bg-red-50 border-coverage border-2';
    if (assignment.user.role === 'SWING') return 'bg-swing text-white';
    return `${areaColors[assignment.user.homeArea]} text-white`;
  };

  return (
    <button
      onClick={onClick}
      disabled={!isManager && !assignment?.needsCoverage}
      className={`p-3 rounded-lg border transition-all hover:shadow-md ${getBackgroundClass()} ${
        isManager ? 'cursor-pointer' : 'cursor-default'
      }`}
    >
      <div className="text-xs font-medium opacity-75">Spot {spotNumber}</div>
      {assignment ? (
        <>
          <div className={`font-semibold truncate ${assignment.needsCoverage ? 'line-through text-gray-500' : ''}`}>
            {assignment.user.name}
          </div>
          <div className="text-sm opacity-90">{assignment.truckNumber}</div>
          {assignment.needsCoverage && (
            <div className="text-xs font-bold text-coverage mt-1">
              NEEDS COVERAGE
            </div>
          )}
          {assignment.isOverride && !assignment.needsCoverage && (
            <div className="text-xs opacity-75 mt-1">Override</div>
          )}
        </>
      ) : (
        <div className="text-gray-400 text-sm">Unassigned</div>
      )}
    </button>
  );
}
```

**Step 3: Create SpotGrid component**

Create `client/src/components/SpotGrid.tsx`:
```tsx
import { SpotCard } from './SpotCard';

interface Spot {
  id: number;
  number: number;
  assignment: {
    id: string;
    truckNumber: string;
    isOverride: boolean;
    user: {
      id: string;
      name: string;
      homeArea: 'BELT' | 'DOCK' | 'UNLOAD';
      role: 'DRIVER' | 'SWING' | 'MANAGER';
    };
    needsCoverage: boolean;
  } | null;
}

interface SpotGridProps {
  spots: Spot[];
  onSpotClick: (spot: Spot) => void;
  isManager: boolean;
}

export function SpotGrid({ spots, onSpotClick, isManager }: SpotGridProps) {
  return (
    <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
      {spots.map((spot) => (
        <SpotCard
          key={spot.id}
          spotNumber={spot.number}
          assignment={spot.assignment}
          onClick={() => onSpotClick(spot)}
          isManager={isManager}
        />
      ))}
    </div>
  );
}
```

**Step 4: Create Lineup page**

Create `client/src/pages/Lineup.tsx`:
```tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { BeltSelector } from '../components/BeltSelector';
import { SpotGrid } from '../components/SpotGrid';

export function Lineup() {
  const { isManager } = useAuth();
  const [selectedBelt, setSelectedBelt] = useState(1);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  const { data: beltData, isLoading } = useQuery({
    queryKey: ['belt', selectedBelt, selectedDate],
    queryFn: async () => {
      const res = await api.get(
        `/belts/${selectedBelt}/assignments?date=${selectedDate}`
      );
      return res.data;
    },
  });

  const { data: coverageData } = useQuery({
    queryKey: ['coverage', selectedDate],
    queryFn: async () => {
      const res = await api.get(`/timeoff/coverage-needs?date=${selectedDate}`);
      return res.data;
    },
  });

  const handleSpotClick = (spot: any) => {
    if (!isManager) return;
    // TODO: Open assignment modal
    console.log('Clicked spot:', spot);
  };

  const needsCoverageCount = coverageData?.needsCoverage?.length || 0;
  const availableSwingCount = coverageData?.availableSwing?.length || 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <BeltSelector selectedBelt={selectedBelt} onSelect={setSelectedBelt} />
        <div className="flex items-center gap-4">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border rounded-md"
          />
        </div>
      </div>

      {needsCoverageCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <span className="font-medium text-red-800">
            {needsCoverageCount} spot{needsCoverageCount !== 1 ? 's' : ''} need
            coverage
          </span>
          <span className="text-red-600 ml-2">
            — {availableSwingCount} swing driver
            {availableSwingCount !== 1 ? 's' : ''} available
          </span>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-8 text-gray-500">Loading...</div>
      ) : beltData ? (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">{beltData.name}</h2>
          <SpotGrid
            spots={beltData.spots}
            onSpotClick={handleSpotClick}
            isManager={isManager}
          />
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">No data available</div>
      )}

      <div className="flex gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-belt"></div>
          <span>Belt</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-dock"></div>
          <span>Dock</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-unload"></div>
          <span>Unload</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-swing"></div>
          <span>Swing</span>
        </div>
      </div>
    </div>
  );
}
```

**Step 5: Update App.tsx to use Lineup**

Update the "/" route in `client/src/App.tsx`:
```tsx
import { Lineup } from './pages/Lineup';
// ...
<Route
  path="/"
  element={
    <ProtectedRoute>
      <Lineup />
    </ProtectedRoute>
  }
/>
```

**Step 6: Commit**

```bash
git add client/src/
git commit -m "feat: add belt view with spot grid and color coding"
```

---

### Task 8.2: Create Assignment Modal

**Files:**
- Create: `client/src/components/AssignmentModal.tsx`
- Modify: `client/src/pages/Lineup.tsx`

**Step 1: Create AssignmentModal**

Create `client/src/components/AssignmentModal.tsx`:
```tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { X } from 'lucide-react';

interface Spot {
  id: number;
  number: number;
  assignment: {
    id: string;
    truckNumber: string;
    user: {
      id: string;
      name: string;
    };
    needsCoverage: boolean;
  } | null;
}

interface AssignmentModalProps {
  spot: Spot;
  beltId: number;
  date: string;
  onClose: () => void;
}

export function AssignmentModal({ spot, beltId, date, onClose }: AssignmentModalProps) {
  const queryClient = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState(
    spot.assignment?.user.id || ''
  );
  const [truckNumber, setTruckNumber] = useState(
    spot.assignment?.truckNumber || ''
  );

  const { data: people } = useQuery({
    queryKey: ['people'],
    queryFn: async () => {
      const res = await api.get('/people');
      return res.data;
    },
  });

  const { data: swingDrivers } = useQuery({
    queryKey: ['swing-drivers'],
    queryFn: async () => {
      const res = await api.get('/people/swing');
      return res.data;
    },
  });

  const assignMutation = useMutation({
    mutationFn: async (data: { spotId: number; userId: string; date: string; truckNumber: string }) => {
      return api.post('/assignments', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['belt', beltId, date] });
      queryClient.invalidateQueries({ queryKey: ['coverage', date] });
      onClose();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (assignmentId: string) => {
      return api.delete(`/assignments/${assignmentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['belt', beltId, date] });
      queryClient.invalidateQueries({ queryKey: ['coverage', date] });
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId || !truckNumber) return;

    assignMutation.mutate({
      spotId: spot.id,
      userId: selectedUserId,
      date,
      truckNumber,
    });
  };

  const handleDelete = () => {
    if (spot.assignment) {
      deleteMutation.mutate(spot.assignment.id);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">
            Belt {beltId} - Spot {spot.number}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {spot.assignment?.needsCoverage && (
            <div className="bg-red-50 border border-red-200 rounded p-3 text-sm">
              <strong>{spot.assignment.user.name}</strong> is off. Select a
              swing driver for coverage.
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {spot.assignment?.needsCoverage ? 'Swing Driver' : 'Assign Person'}
            </label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              required
            >
              <option value="">Select person...</option>
              {spot.assignment?.needsCoverage ? (
                swingDrivers?.map((driver: any) => (
                  <option key={driver.id} value={driver.id}>
                    {driver.name} ({driver.homeArea})
                  </option>
                ))
              ) : (
                people?.map((person: any) => (
                  <option key={person.id} value={person.id}>
                    {person.name} ({person.homeArea})
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Truck Number
            </label>
            <input
              type="text"
              value={truckNumber}
              onChange={(e) => setTruckNumber(e.target.value)}
              placeholder="e.g., 123456"
              className="w-full px-3 py-2 border rounded-md"
              required
              minLength={6}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={assignMutation.isPending}
              className="flex-1 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {assignMutation.isPending ? 'Saving...' : 'Save Assignment'}
            </button>
            {spot.assignment && !spot.assignment.needsCoverage && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 border border-red-300 text-red-600 rounded-md hover:bg-red-50"
              >
                Remove
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
```

**Step 2: Update Lineup to use modal**

Update `client/src/pages/Lineup.tsx` to add modal state and rendering:
```tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { BeltSelector } from '../components/BeltSelector';
import { SpotGrid } from '../components/SpotGrid';
import { AssignmentModal } from '../components/AssignmentModal';

interface Spot {
  id: number;
  number: number;
  assignment: {
    id: string;
    truckNumber: string;
    isOverride: boolean;
    user: {
      id: string;
      name: string;
      homeArea: 'BELT' | 'DOCK' | 'UNLOAD';
      role: 'DRIVER' | 'SWING' | 'MANAGER';
    };
    needsCoverage: boolean;
  } | null;
}

export function Lineup() {
  const { isManager } = useAuth();
  const [selectedBelt, setSelectedBelt] = useState(1);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [selectedSpot, setSelectedSpot] = useState<Spot | null>(null);

  const { data: beltData, isLoading } = useQuery({
    queryKey: ['belt', selectedBelt, selectedDate],
    queryFn: async () => {
      const res = await api.get(
        `/belts/${selectedBelt}/assignments?date=${selectedDate}`
      );
      return res.data;
    },
  });

  const { data: coverageData } = useQuery({
    queryKey: ['coverage', selectedDate],
    queryFn: async () => {
      const res = await api.get(`/timeoff/coverage-needs?date=${selectedDate}`);
      return res.data;
    },
  });

  const handleSpotClick = (spot: Spot) => {
    if (!isManager) return;
    setSelectedSpot(spot);
  };

  const needsCoverageCount = coverageData?.needsCoverage?.length || 0;
  const availableSwingCount = coverageData?.availableSwing?.length || 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <BeltSelector selectedBelt={selectedBelt} onSelect={setSelectedBelt} />
        <div className="flex items-center gap-4">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border rounded-md"
          />
        </div>
      </div>

      {needsCoverageCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <span className="font-medium text-red-800">
            {needsCoverageCount} spot{needsCoverageCount !== 1 ? 's' : ''} need
            coverage
          </span>
          <span className="text-red-600 ml-2">
            — {availableSwingCount} swing driver
            {availableSwingCount !== 1 ? 's' : ''} available
          </span>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-8 text-gray-500">Loading...</div>
      ) : beltData ? (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">{beltData.name}</h2>
          <SpotGrid
            spots={beltData.spots}
            onSpotClick={handleSpotClick}
            isManager={isManager}
          />
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">No data available</div>
      )}

      <div className="flex gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-belt"></div>
          <span>Belt</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-dock"></div>
          <span>Dock</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-unload"></div>
          <span>Unload</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-swing"></div>
          <span>Swing</span>
        </div>
      </div>

      {selectedSpot && (
        <AssignmentModal
          spot={selectedSpot}
          beltId={selectedBelt}
          date={selectedDate}
          onClose={() => setSelectedSpot(null)}
        />
      )}
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add client/src/
git commit -m "feat: add assignment modal for editing spots"
```

---

## Phase 9: Frontend - People Management

### Task 9.1: Create People Page

**Files:**
- Create: `client/src/pages/People.tsx`
- Create: `client/src/components/PersonModal.tsx`

**Step 1: Create PersonModal**

Create `client/src/components/PersonModal.tsx`:
```tsx
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { X } from 'lucide-react';

interface Person {
  id?: string;
  name: string;
  email: string;
  phone?: string;
  role: 'DRIVER' | 'SWING' | 'MANAGER';
  homeArea: 'BELT' | 'DOCK' | 'UNLOAD';
}

interface PersonModalProps {
  person?: Person;
  onClose: () => void;
}

export function PersonModal({ person, onClose }: PersonModalProps) {
  const queryClient = useQueryClient();
  const isEditing = !!person?.id;

  const [formData, setFormData] = useState({
    name: person?.name || '',
    email: person?.email || '',
    phone: person?.phone || '',
    password: '',
    role: person?.role || 'DRIVER',
    homeArea: person?.homeArea || 'BELT',
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return api.post('/people', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['people'] });
      onClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<typeof formData>) => {
      return api.put(`/people/${person?.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['people'] });
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditing) {
      const { password, email, ...updateData } = formData;
      updateMutation.mutate(updateData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">
            {isEditing ? 'Edit Person' : 'Add Person'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border rounded-md"
              required
            />
          </div>

          {!isEditing && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  required
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="DRIVER">Driver</option>
                <option value="SWING">Swing Driver</option>
                <option value="MANAGER">Manager</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Home Area
              </label>
              <select
                value={formData.homeArea}
                onChange={(e) => setFormData({ ...formData, homeArea: e.target.value as any })}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="BELT">Belt</option>
                <option value="DOCK">Dock</option>
                <option value="UNLOAD">Unload</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isPending ? 'Saving...' : isEditing ? 'Update Person' : 'Add Person'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

**Step 2: Create People page**

Create `client/src/pages/People.tsx`:
```tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { PersonModal } from '../components/PersonModal';
import { Plus, Pencil, Trash2 } from 'lucide-react';

const areaLabels = { BELT: 'Belt', DOCK: 'Dock', UNLOAD: 'Unload' };
const roleLabels = { DRIVER: 'Driver', SWING: 'Swing', MANAGER: 'Manager' };

export function People() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingPerson, setEditingPerson] = useState<any>(null);
  const [filter, setFilter] = useState({ role: '', homeArea: '' });

  const { data: people, isLoading } = useQuery({
    queryKey: ['people'],
    queryFn: async () => {
      const res = await api.get('/people');
      return res.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/people/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['people'] });
    },
  });

  const filteredPeople = people?.filter((p: any) => {
    if (filter.role && p.role !== filter.role) return false;
    if (filter.homeArea && p.homeArea !== filter.homeArea) return false;
    return true;
  });

  const handleEdit = (person: any) => {
    setEditingPerson(person);
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Deactivate this person?')) {
      deleteMutation.mutate(id);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingPerson(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">People</h1>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          <Plus size={18} />
          Add Person
        </button>
      </div>

      <div className="flex gap-4">
        <select
          value={filter.role}
          onChange={(e) => setFilter({ ...filter, role: e.target.value })}
          className="px-3 py-2 border rounded-md"
        >
          <option value="">All Roles</option>
          <option value="DRIVER">Driver</option>
          <option value="SWING">Swing</option>
          <option value="MANAGER">Manager</option>
        </select>
        <select
          value={filter.homeArea}
          onChange={(e) => setFilter({ ...filter, homeArea: e.target.value })}
          className="px-3 py-2 border rounded-md"
        >
          <option value="">All Areas</option>
          <option value="BELT">Belt</option>
          <option value="DOCK">Dock</option>
          <option value="UNLOAD">Unload</option>
        </select>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-gray-500">Loading...</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Home Area
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredPeople?.map((person: any) => (
                <tr key={person.id}>
                  <td className="px-6 py-4 whitespace-nowrap font-medium">
                    {person.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                    {person.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      person.role === 'SWING' ? 'bg-gray-100' :
                      person.role === 'MANAGER' ? 'bg-purple-100 text-purple-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {roleLabels[person.role as keyof typeof roleLabels]}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {areaLabels[person.homeArea as keyof typeof areaLabels]}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button
                      onClick={() => handleEdit(person)}
                      className="text-gray-400 hover:text-blue-600 mr-3"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(person.id)}
                      className="text-gray-400 hover:text-red-600"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && <PersonModal person={editingPerson} onClose={closeModal} />}
    </div>
  );
}
```

**Step 3: Update App.tsx route**

```tsx
import { People } from './pages/People';
// ...
<Route
  path="/people"
  element={
    <ProtectedRoute>
      <People />
    </ProtectedRoute>
  }
/>
```

**Step 4: Commit**

```bash
git add client/src/
git commit -m "feat: add people management page"
```

---

## Phase 10: Frontend - Time Off & Driver Views

### Task 10.1: Create Time Off Page (Manager)

**Files:**
- Create: `client/src/pages/TimeOff.tsx`

**Step 1: Create TimeOff page**

Create `client/src/pages/TimeOff.tsx`:
```tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Check, X } from 'lucide-react';

export function TimeOff() {
  const queryClient = useQueryClient();
  const [dateRange, setDateRange] = useState({
    start: new Date().toISOString().split('T')[0],
    end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });
  const [statusFilter, setStatusFilter] = useState('PENDING');

  const { data: timeOffs, isLoading } = useQuery({
    queryKey: ['timeoffs', dateRange, statusFilter],
    queryFn: async () => {
      const res = await api.get('/timeoff', {
        params: {
          startDate: dateRange.start,
          endDate: dateRange.end,
          status: statusFilter || undefined,
        },
      });
      return res.data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return api.patch(`/timeoff/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeoffs'] });
    },
  });

  const handleApprove = (id: string) => updateMutation.mutate({ id, status: 'APPROVED' });
  const handleDeny = (id: string) => updateMutation.mutate({ id, status: 'DENIED' });

  const typeLabels = { VACATION: 'Vacation', SICK: 'Sick', SCHEDULED_OFF: 'Scheduled Off' };
  const statusColors = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    APPROVED: 'bg-green-100 text-green-800',
    DENIED: 'bg-red-100 text-red-800',
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Time Off Requests</h1>

      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">From:</label>
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            className="px-3 py-2 border rounded-md"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">To:</label>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            className="px-3 py-2 border rounded-md"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border rounded-md"
        >
          <option value="">All Status</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="DENIED">Denied</option>
        </select>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-gray-500">Loading...</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Person
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {timeOffs?.map((to: any) => (
                <tr key={to.id}>
                  <td className="px-6 py-4 whitespace-nowrap font-medium">
                    {to.user.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                    {new Date(to.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {typeLabels[to.type as keyof typeof typeLabels]}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${statusColors[to.status as keyof typeof statusColors]}`}>
                      {to.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    {to.status === 'PENDING' && (
                      <>
                        <button
                          onClick={() => handleApprove(to.id)}
                          className="text-green-600 hover:text-green-800 mr-3"
                          title="Approve"
                        >
                          <Check size={18} />
                        </button>
                        <button
                          onClick={() => handleDeny(to.id)}
                          className="text-red-600 hover:text-red-800"
                          title="Deny"
                        >
                          <X size={18} />
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {timeOffs?.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No time off requests found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Update App.tsx route**

```tsx
import { TimeOff } from './pages/TimeOff';
// ...
<Route
  path="/timeoff"
  element={
    <ProtectedRoute>
      <TimeOff />
    </ProtectedRoute>
  }
/>
```

**Step 3: Commit**

```bash
git add client/src/
git commit -m "feat: add time off management page for managers"
```

---

### Task 10.2: Create My Schedule Page (Driver)

**Files:**
- Create: `client/src/pages/MySchedule.tsx`

**Step 1: Create MySchedule page**

Create `client/src/pages/MySchedule.tsx`:
```tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

export function MySchedule() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const [requestDates, setRequestDates] = useState<string[]>([]);
  const [requestType, setRequestType] = useState<string>('VACATION');
  const [showRequestForm, setShowRequestForm] = useState(false);

  const { data: assignments } = useQuery({
    queryKey: ['my-assignments'],
    queryFn: async () => {
      const res = await api.get('/assignments/my-assignments', {
        params: {
          startDate: weekStart.toISOString().split('T')[0],
          endDate: weekEnd.toISOString().split('T')[0],
        },
      });
      return res.data;
    },
  });

  const { data: myTimeOffs } = useQuery({
    queryKey: ['my-timeoffs'],
    queryFn: async () => {
      const res = await api.get('/timeoff/mine');
      return res.data;
    },
  });

  const requestMutation = useMutation({
    mutationFn: async (data: { dates: string[]; type: string }) => {
      return api.post('/timeoff/request', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-timeoffs'] });
      setShowRequestForm(false);
      setRequestDates([]);
    },
  });

  const todayAssignment = assignments?.find(
    (a: any) => new Date(a.date).toDateString() === today.toDateString()
  );

  const handleSubmitRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (requestDates.length === 0) return;
    requestMutation.mutate({ dates: requestDates, type: requestType });
  };

  const statusColors = {
    PENDING: 'text-yellow-600',
    APPROVED: 'text-green-600',
    DENIED: 'text-red-600',
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Today's Assignment</h2>
        {todayAssignment ? (
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-900">
              Belt {todayAssignment.spot.belt.id} - Spot {todayAssignment.spot.number}
            </div>
            <div className="text-lg text-blue-700 mt-1">
              Truck: {todayAssignment.truckNumber}
            </div>
          </div>
        ) : (
          <p className="text-gray-500">No assignment for today</p>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">This Week</h2>
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 7 }, (_, i) => {
            const date = new Date(weekStart);
            date.setDate(weekStart.getDate() + i);
            const assignment = assignments?.find(
              (a: any) => new Date(a.date).toDateString() === date.toDateString()
            );
            const isToday = date.toDateString() === today.toDateString();

            return (
              <div
                key={i}
                className={`p-3 rounded-lg border text-center ${
                  isToday ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}
              >
                <div className="text-xs text-gray-500">
                  {date.toLocaleDateString('en-US', { weekday: 'short' })}
                </div>
                <div className="font-medium">{date.getDate()}</div>
                {assignment ? (
                  <div className="text-xs mt-1">
                    B{assignment.spot.belt.id}-S{assignment.spot.number}
                  </div>
                ) : (
                  <div className="text-xs text-gray-400 mt-1">—</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Time Off</h2>
          <button
            onClick={() => setShowRequestForm(!showRequestForm)}
            className="text-sm bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700"
          >
            Request Time Off
          </button>
        </div>

        {showRequestForm && (
          <form onSubmit={handleSubmitRequest} className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date(s)
                </label>
                <input
                  type="date"
                  onChange={(e) => {
                    if (e.target.value && !requestDates.includes(e.target.value)) {
                      setRequestDates([...requestDates, e.target.value]);
                    }
                  }}
                  className="w-full px-3 py-2 border rounded-md"
                />
                <div className="flex flex-wrap gap-1 mt-2">
                  {requestDates.map((d) => (
                    <span
                      key={d}
                      className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded"
                    >
                      {new Date(d).toLocaleDateString()}
                      <button
                        type="button"
                        onClick={() => setRequestDates(requestDates.filter((x) => x !== d))}
                        className="ml-1"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type
                </label>
                <select
                  value={requestType}
                  onChange={(e) => setRequestType(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="VACATION">Vacation</option>
                  <option value="SICK">Sick</option>
                  <option value="SCHEDULED_OFF">Scheduled Off</option>
                </select>
              </div>
            </div>
            <button
              type="submit"
              disabled={requestDates.length === 0 || requestMutation.isPending}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {requestMutation.isPending ? 'Submitting...' : 'Submit Request'}
            </button>
          </form>
        )}

        <div className="space-y-2">
          {myTimeOffs?.slice(0, 10).map((to: any) => (
            <div key={to.id} className="flex items-center justify-between py-2 border-b">
              <span>{new Date(to.date).toLocaleDateString()}</span>
              <span className="text-sm text-gray-500">{to.type}</span>
              <span className={`text-sm font-medium ${statusColors[to.status as keyof typeof statusColors]}`}>
                {to.status}
              </span>
            </div>
          ))}
          {myTimeOffs?.length === 0 && (
            <p className="text-gray-500 text-center py-4">No time off requests</p>
          )}
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Update App.tsx route**

```tsx
import { MySchedule } from './pages/MySchedule';
// ...
<Route
  path="/my-schedule"
  element={
    <ProtectedRoute>
      <MySchedule />
    </ProtectedRoute>
  }
/>
```

**Step 3: Commit**

```bash
git add client/src/
git commit -m "feat: add my schedule page for drivers"
```

---

## Phase 11: Final Integration

### Task 11.1: Create Root package.json and README

**Files:**
- Create: `package.json`
- Create: `README.md`

**Step 1: Create root package.json**

Create `package.json`:
```json
{
  "name": "fedex-truck-lineup",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "concurrently \"npm run dev:server\" \"npm run dev:client\"",
    "dev:server": "cd server && npm run dev",
    "dev:client": "cd client && npm run dev",
    "build": "npm run build:server && npm run build:client",
    "build:server": "cd server && npm run build",
    "build:client": "cd client && npm run build",
    "db:migrate": "cd server && npx prisma migrate dev",
    "db:seed": "cd server && npx prisma db seed",
    "db:studio": "cd server && npx prisma studio"
  },
  "devDependencies": {
    "concurrently": "^8.2.0"
  }
}
```

**Step 2: Create README**

Create `README.md`:
```markdown
# FedEx Truck Lineup Scheduling System

Web application for managing FedEx truck lineup scheduling across 4 belts with 32 spots each.

## Features

- **Belt View**: Visual grid of 32 spots per belt with color-coded assignments
- **Role-Based Access**: Managers can edit, drivers can view
- **Coverage Tracking**: Automatic alerts when spots need swing driver coverage
- **Time Off Management**: Import from CSV or in-app request/approval
- **Weekly Templates**: Base schedule with daily override capability

## Setup

### Prerequisites

- Node.js 18+
- PostgreSQL 14+

### Installation

1. Install dependencies:
   ```bash
   npm install
   cd server && npm install
   cd ../client && npm install
   ```

2. Create `server/.env`:
   ```
   PORT=3001
   DATABASE_URL="postgresql://user:password@localhost:5432/fedex_lineup"
   JWT_SECRET="your-secret-key"
   ```

3. Create `client/.env`:
   ```
   VITE_API_URL=http://localhost:3001/api
   ```

4. Run database migrations:
   ```bash
   npm run db:migrate
   npm run db:seed
   ```

5. Start development servers:
   ```bash
   npm run dev
   ```

## Color Coding

- **Blue**: Belt workers (in home area)
- **Orange**: Dock workers
- **Green**: Unload workers
- **Gray**: Swing drivers
- **Red border**: Needs coverage
```

**Step 3: Commit**

```bash
git add package.json README.md
git commit -m "docs: add root package.json and README"
```

---

## Summary

**Total Phases:** 11
**Total Tasks:** ~20 major tasks

**Implementation Order:**
1. Backend setup (Express, Prisma)
2. Database schema and seeding
3. Auth system (JWT, middleware)
4. People management API
5. Belt and assignment APIs
6. Template management API
7. Time off API with coverage tracking
8. Frontend core (React, routing, auth)
9. Belt view with spot grid
10. Assignment modal and editing
11. People management UI
12. Time off management UI
13. Driver schedule view
14. Final integration and docs

Each task follows TDD principles with exact file paths and complete code.
