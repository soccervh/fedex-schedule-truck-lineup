# Invite-Only Registration & Access Levels Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace open user creation with invite-only registration via email links, add a 4-tier access level system (Highest Manager, OP Lead, Truck Mover, Employee) separate from scheduling roles, and assign each employee a primary manager.

**Architecture:** Add `AccessLevel` enum and `managerId` self-relation to User, plus a new `InviteToken` model. Replace the `requireManager` middleware with `requireAccessLevel(level)` that checks tiered permissions. New invite routes handle token generation, email sending, and account activation. Client adds an invite acceptance page (public) and updates the People page to send invites instead of directly creating users with passwords.

**Tech Stack:** Prisma (PostgreSQL), Express, JWT, nodemailer, React Router v7, React Query, Tailwind CSS

---

### Task 1: Database Schema — Add AccessLevel enum, managerId, and InviteToken model

**Files:**
- Modify: `server/prisma/schema.prisma`

**Step 1: Add the AccessLevel enum after the existing enums**

Add this after the `WorkSchedule` enum (around line 37):

```prisma
enum AccessLevel {
  HIGHEST_MANAGER
  OP_LEAD
  TRUCK_MOVER
  EMPLOYEE
}
```

**Step 2: Update the User model**

Add these fields to the User model:

```prisma
model User {
  // ... existing fields ...
  password     String?                          // Change from String to String? (optional for invited users)
  accessLevel  AccessLevel  @default(EMPLOYEE)  // Add after role field
  managerId    String?                          // Add self-relation
  manager      User?        @relation("ManagerEmployees", fields: [managerId], references: [id])
  employees    User[]       @relation("ManagerEmployees")
  // ... existing relations ...
  inviteTokens InviteToken[]                    // Add relation to invite tokens
}
```

The `password` field changes from `String` to `String?` to allow invited users who haven't set their password yet.

**Step 3: Add the InviteToken model**

Add at the end of the schema:

```prisma
model InviteToken {
  id        String    @id @default(cuid())
  token     String    @unique
  userId    String
  user      User      @relation(fields: [userId], references: [id])
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime  @default(now())
}
```

**Step 4: Create and run the migration**

Run: `cd server && npx prisma migrate dev --name add-access-levels-and-invites`

Expected: Migration creates successfully. Existing users get `EMPLOYEE` as default access level, null managerId, and null password stays as-is (existing passwords preserved).

**Step 5: Create a data migration to set existing managers to HIGHEST_MANAGER**

Run this via prisma studio or a one-off script. After the migration, update existing MANAGER-role users:

```sql
UPDATE "User" SET "accessLevel" = 'HIGHEST_MANAGER' WHERE "role" = 'MANAGER';
```

Run: `cd server && npx prisma db execute --stdin <<< "UPDATE \"User\" SET \"accessLevel\" = 'HIGHEST_MANAGER' WHERE \"role\" = 'MANAGER';"`

Or do it in seed.ts if resetting the database.

**Step 6: Commit**

```bash
git add server/prisma/schema.prisma server/prisma/migrations/
git commit -m "feat: add AccessLevel enum, managerId, and InviteToken model to schema"
```

---

### Task 2: Update Auth Middleware — Replace requireManager with requireAccessLevel

**Files:**
- Modify: `server/src/middleware/auth.ts`

**Step 1: Update AuthPayload to include accessLevel**

Replace the current `AuthPayload` interface and related constants:

```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required but not set');
}
const JWT_SECRET: string = process.env.JWT_SECRET;

export type AccessLevel = 'HIGHEST_MANAGER' | 'OP_LEAD' | 'TRUCK_MOVER' | 'EMPLOYEE';

// Ordered from highest to lowest access
const ACCESS_LEVEL_HIERARCHY: AccessLevel[] = [
  'HIGHEST_MANAGER',
  'OP_LEAD',
  'TRUCK_MOVER',
  'EMPLOYEE',
];

export interface AuthPayload {
  userId: string;
  role: string;
  accessLevel: AccessLevel;
}

export interface AuthRequest extends Request {
  user?: AuthPayload;
}
```

**Step 2: Update the isValidPayload function**

```typescript
function isValidPayload(payload: unknown): payload is AuthPayload {
  if (typeof payload !== 'object' || payload === null) return false;
  const obj = payload as Record<string, unknown>;
  return (
    typeof obj.userId === 'string' &&
    obj.userId.length > 0 &&
    typeof obj.role === 'string' &&
    typeof obj.accessLevel === 'string' &&
    ACCESS_LEVEL_HIERARCHY.includes(obj.accessLevel as AccessLevel)
  );
}
```

**Step 3: Keep authenticate middleware as-is (it already works)**

No changes needed to the `authenticate` function.

**Step 4: Replace requireManager with requireAccessLevel**

Remove `requireManager` and add:

```typescript
export function requireAccessLevel(minLevel: AccessLevel) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    const userIndex = ACCESS_LEVEL_HIERARCHY.indexOf(req.user.accessLevel);
    const requiredIndex = ACCESS_LEVEL_HIERARCHY.indexOf(minLevel);
    // Lower index = higher access
    if (userIndex > requiredIndex) {
      return res.status(403).json({ error: `${minLevel} access or higher required` });
    }
    next();
  };
}

// Keep backward compat alias during migration
export const requireManager = requireAccessLevel('HIGHEST_MANAGER');
```

**Step 5: Commit**

```bash
git add server/src/middleware/auth.ts
git commit -m "feat: replace requireManager with tiered requireAccessLevel middleware"
```

---

### Task 3: Update Auth Routes — Add accessLevel to JWT and add invite acceptance endpoints

**Files:**
- Modify: `server/src/routes/auth.ts`

**Step 1: Update login to include accessLevel in JWT token**

In the login endpoint, change the token creation and response to include `accessLevel`:

```typescript
const token = jwt.sign(
  { userId: user.id, role: user.role, accessLevel: user.accessLevel },
  JWT_SECRET,
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
    accessLevel: user.accessLevel,
  },
});
```

Also add a check that the user has a password set (invited users who haven't accepted yet have null password):

```typescript
if (!user || !user.isActive) {
  return res.status(401).json({ error: 'Invalid credentials' });
}

if (!user.password) {
  return res.status(401).json({ error: 'Account not yet activated. Check your email for the invite link.' });
}
```

**Step 2: Update /me endpoint to include accessLevel**

```typescript
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
        accessLevel: true,
      },
    });
    // ...
```

**Step 3: Add GET /validate-invite endpoint (public)**

```typescript
import crypto from 'crypto';

// Validate invite token (public - no auth needed)
router.get('/validate-invite', async (req, res) => {
  try {
    const { token } = req.query;
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Token required' });
    }

    const invite = await prisma.inviteToken.findUnique({
      where: { token },
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true },
        },
      },
    });

    if (!invite) {
      return res.status(404).json({ error: 'Invalid invite link' });
    }
    if (invite.usedAt) {
      return res.status(410).json({ error: 'This invite has already been used' });
    }
    if (invite.expiresAt < new Date()) {
      return res.status(410).json({ error: 'This invite link has expired. Ask your manager to resend it.' });
    }

    res.json({ user: invite.user });
  } catch (error) {
    console.error('Validate invite error:', error);
    res.status(500).json({ error: 'Failed to validate invite' });
  }
});
```

**Step 4: Add POST /accept-invite endpoint (public)**

```typescript
// Accept invite and set password (public - token validated)
router.post('/accept-invite', async (req, res) => {
  try {
    const { token, password, phone } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: 'Token and password required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const invite = await prisma.inviteToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!invite) {
      return res.status(404).json({ error: 'Invalid invite link' });
    }
    if (invite.usedAt) {
      return res.status(410).json({ error: 'This invite has already been used' });
    }
    if (invite.expiresAt < new Date()) {
      return res.status(410).json({ error: 'This invite link has expired' });
    }

    const hashedPassword = await hashPassword(password);

    // Update user and mark invite as used in a transaction
    const user = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: invite.userId },
        data: {
          password: hashedPassword,
          phone: phone || invite.user.phone,
          isActive: true,
        },
      });

      await tx.inviteToken.update({
        where: { id: invite.id },
        data: { usedAt: new Date() },
      });

      return updated;
    });

    // Auto-login: generate JWT
    const jwtToken = jwt.sign(
      { userId: user.id, role: user.role, accessLevel: user.accessLevel },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token: jwtToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        homeArea: user.homeArea,
        accessLevel: user.accessLevel,
      },
    });
  } catch (error) {
    console.error('Accept invite error:', error);
    res.status(500).json({ error: 'Failed to accept invite' });
  }
});
```

**Step 5: Commit**

```bash
git add server/src/routes/auth.ts
git commit -m "feat: add accessLevel to JWT, add invite validation and acceptance endpoints"
```

---

### Task 4: Create Invite Routes — Send invites, resend, list pending

**Files:**
- Create: `server/src/routes/invites.ts`
- Modify: `server/src/index.ts` (register new route)

**Step 1: Create the invites route file**

Create `server/src/routes/invites.ts`:

```typescript
import { Router } from 'express';
import crypto from 'crypto';
import { authenticate, requireAccessLevel, AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { sendEmail } from '../utils/email';

const router = Router();

const APP_URL = process.env.APP_URL || 'http://localhost:5173';

// Send invite (Highest Manager only)
router.post('/', authenticate, requireAccessLevel('HIGHEST_MANAGER'), async (req: AuthRequest, res) => {
  try {
    const { name, email, phone, role, homeArea, workSchedule, accessLevel, managerId } = req.body;

    if (!name || !email || !role || !homeArea || !accessLevel) {
      return res.status(400).json({ error: 'Name, email, role, home area, and access level are required' });
    }

    // Check email doesn't already exist
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'A user with this email already exists' });
    }

    // Create user without password (inactive)
    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        role,
        homeArea,
        workSchedule: workSchedule || 'MON_FRI',
        accessLevel,
        managerId,
        isActive: false,
      },
    });

    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

    await prisma.inviteToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt,
      },
    });

    // Get inviter name for email
    const inviter = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { name: true },
    });

    // Send invite email
    const inviteLink = `${APP_URL}/invite/accept?token=${token}`;
    sendEmail(
      [email],
      'You\'ve been invited to FedEx Truck Lineup',
      `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to FedEx Truck Lineup, ${name}!</h2>
        <p>${inviter?.name || 'A manager'} has invited you to join the FedEx Truck Lineup app.</p>
        <p>Click the button below to set up your password and activate your account:</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${inviteLink}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Set Up Your Account
          </a>
        </p>
        <p style="color: #666; font-size: 14px;">This link expires in 48 hours.</p>
        <p style="color: #666; font-size: 14px;">If the button doesn't work, copy and paste this URL into your browser:<br/>${inviteLink}</p>
      </div>`,
    );

    res.status(201).json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      accessLevel: user.accessLevel,
      isActive: false,
    });
  } catch (error) {
    console.error('Send invite error:', error);
    res.status(500).json({ error: 'Failed to send invite' });
  }
});

// List pending invites (Highest Manager only)
router.get('/pending', authenticate, requireAccessLevel('HIGHEST_MANAGER'), async (req: AuthRequest, res) => {
  try {
    const pendingUsers = await prisma.user.findMany({
      where: { isActive: false, password: null },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        accessLevel: true,
        createdAt: true,
        inviteTokens: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { expiresAt: true, usedAt: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const result = pendingUsers.map((u) => {
      const latestToken = u.inviteTokens[0];
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        accessLevel: u.accessLevel,
        createdAt: u.createdAt,
        inviteExpired: latestToken ? latestToken.expiresAt < new Date() : true,
      };
    });

    res.json(result);
  } catch (error) {
    console.error('List pending invites error:', error);
    res.status(500).json({ error: 'Failed to list pending invites' });
  }
});

// Resend invite (Highest Manager only)
router.post('/:id/resend', authenticate, requireAccessLevel('HIGHEST_MANAGER'), async (req: AuthRequest, res) => {
  try {
    const userId = req.params.id;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.isActive) return res.status(400).json({ error: 'User already activated' });

    // Generate new token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    await prisma.inviteToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt,
      },
    });

    const inviter = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { name: true },
    });

    const inviteLink = `${APP_URL}/invite/accept?token=${token}`;
    sendEmail(
      [user.email],
      'You\'ve been invited to FedEx Truck Lineup',
      `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to FedEx Truck Lineup, ${user.name}!</h2>
        <p>${inviter?.name || 'A manager'} has re-sent your invitation to join the FedEx Truck Lineup app.</p>
        <p>Click the button below to set up your password and activate your account:</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${inviteLink}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Set Up Your Account
          </a>
        </p>
        <p style="color: #666; font-size: 14px;">This link expires in 48 hours.</p>
        <p style="color: #666; font-size: 14px;">If the button doesn't work, copy and paste this URL into your browser:<br/>${inviteLink}</p>
      </div>`,
    );

    res.json({ message: 'Invite resent successfully' });
  } catch (error) {
    console.error('Resend invite error:', error);
    res.status(500).json({ error: 'Failed to resend invite' });
  }
});

export default router;
```

**Step 2: Register invite routes in server/src/index.ts**

Add after the existing imports:

```typescript
import inviteRoutes from './routes/invites';
```

Add after the existing `app.use` lines:

```typescript
app.use('/api/invites', inviteRoutes);
```

**Step 3: Add APP_URL to server/.env.example**

Append:

```
APP_URL=http://localhost:5173
```

**Step 4: Commit**

```bash
git add server/src/routes/invites.ts server/src/index.ts server/.env.example
git commit -m "feat: add invite routes for sending, listing, and resending invites"
```

---

### Task 5: Update People Routes — Use accessLevel instead of role for permissions

**Files:**
- Modify: `server/src/routes/people.ts`

**Step 1: Update imports**

Replace `requireManager` with `requireAccessLevel`:

```typescript
import { authenticate, requireAccessLevel, AuthRequest } from '../middleware/auth';
```

**Step 2: Update GET / (list people)**

Replace the `requireManager` check with access level logic. OP_LEAD+ sees all with emails; TRUCK_MOVER sees names/roles only; EMPLOYEE sees limited:

```typescript
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const isHighAccess = ['HIGHEST_MANAGER', 'OP_LEAD'].includes(req.user!.accessLevel);

    const people = await prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        email: isHighAccess,
        role: true,
        homeArea: true,
        phone: isHighAccess,
        accessLevel: isHighAccess,
        managerId: isHighAccess,
        manager: isHighAccess ? { select: { id: true, name: true } } : false,
      },
      orderBy: { name: 'asc' },
    });

    res.json(people);
  } catch (error) {
    console.error('Get people error:', error);
    res.status(500).json({ error: 'Failed to get people' });
  }
});
```

**Step 3: Update GET /:id (person detail)**

Change the non-manager check to use access level:

```typescript
// Non OP_LEAD+ can only view themselves
if (!['HIGHEST_MANAGER', 'OP_LEAD'].includes(req.user!.accessLevel) && req.user!.userId !== id) {
  return res.status(403).json({ error: 'Not authorized' });
}
```

Add `accessLevel` and `managerId` to the select.

**Step 4: Update POST / (create person) — Highest Manager only**

```typescript
router.post('/', authenticate, requireAccessLevel('HIGHEST_MANAGER'), async (req: AuthRequest, res) => {
```

Add `accessLevel` and `managerId` to the create data.

**Step 5: Update PUT /:id (update person) — Highest Manager only**

```typescript
router.put('/:id', authenticate, requireAccessLevel('HIGHEST_MANAGER'), async (req: AuthRequest, res) => {
```

Add `accessLevel` and `managerId` to the update data.

**Step 6: Update DELETE /:id (deactivate) — Highest Manager only**

```typescript
router.delete('/:id', authenticate, requireAccessLevel('HIGHEST_MANAGER'), async (req: AuthRequest, res) => {
```

**Step 7: Commit**

```bash
git add server/src/routes/people.ts
git commit -m "feat: update people routes to use accessLevel-based permissions"
```

---

### Task 6: Update Time Off Routes — Send notifications to assigned manager only

**Files:**
- Modify: `server/src/routes/timeoff.ts`

**Step 1: Update imports**

```typescript
import { authenticate, requireAccessLevel, AuthRequest } from '../middleware/auth';
```

**Step 2: Update GET / (list all time off) — OP_LEAD+ access**

Replace `requireManager` with `requireAccessLevel('OP_LEAD')`.

**Step 3: Update GET /pending-count — OP_LEAD+ access**

Replace `requireManager` with `requireAccessLevel('OP_LEAD')`.

**Step 4: Update POST /request — Change email notification to assigned manager**

Replace lines 141-166 (the manager email notification block):

```typescript
// Send email to assigned manager only (fire-and-forget)
const requester = await prisma.user.findUnique({
  where: { id: req.user!.userId },
  include: { manager: { select: { email: true, name: true } } },
});

if (requester?.manager) {
  const typeLabels: Record<string, string> = {
    VACATION_WEEK: 'Vacation Week',
    VACATION_DAY: 'Vacation Day',
    PERSONAL: 'Personal',
    HOLIDAY: 'Holiday',
    SICK: 'Sick',
    SCHEDULED_OFF: 'Scheduled Off',
  };
  const dateList = datesToCreate.map(d => new Date(d).toLocaleDateString()).join(', ');
  sendEmail(
    [requester.manager.email],
    `Time Off Request: ${requester.name}`,
    `<p><strong>${requester.name}</strong> has requested time off.</p>
     <p><strong>Type:</strong> ${typeLabels[type] || type}</p>
     <p><strong>Date(s):</strong> ${dateList}</p>
     <p>Please review this request in the Time Off management page.</p>`,
  );
}
```

**Step 5: Update PATCH /:id (approve/deny) — OP_LEAD+ with scope check**

Replace `requireManager` with `requireAccessLevel('OP_LEAD')`. Add logic so OP_LEADs can only approve/deny for their assigned employees:

```typescript
router.patch('/:id', authenticate, requireAccessLevel('OP_LEAD'), async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    const { status, note } = req.body;

    if (!status || !['APPROVED', 'DENIED'].includes(status)) {
      return res.status(400).json({ error: 'Valid status required' });
    }

    const existing = await prisma.timeOff.findUnique({
      where: { id },
      include: { user: { select: { managerId: true } } },
    });
    if (!existing) return res.status(404).json({ error: 'Time off not found' });

    // OP_LEADs can only approve their assigned employees
    if (req.user!.accessLevel === 'OP_LEAD' && existing.user.managerId !== req.user!.userId) {
      return res.status(403).json({ error: 'You can only approve/deny time off for your assigned employees' });
    }

    const timeOff = await prisma.timeOff.update({
      where: { id },
      data: { status, note },
      include: { user: { select: { id: true, name: true } } },
    });

    res.json(timeOff);
  } catch (error) {
    console.error('Update time off error:', error);
    res.status(500).json({ error: 'Failed to update time off' });
  }
});
```

**Step 6: Update POST /import — Highest Manager only**

Replace `requireManager` with `requireAccessLevel('HIGHEST_MANAGER')`.

**Step 7: Commit**

```bash
git add server/src/routes/timeoff.ts
git commit -m "feat: update timeoff routes to use accessLevel, send notifications to assigned manager"
```

---

### Task 7: Update Remaining Server Routes — Use accessLevel where needed

**Files:**
- Modify: `server/src/routes/assignments.ts`
- Modify: `server/src/routes/templates.ts`
- Modify: `server/src/routes/trucks.ts`
- Modify: `server/src/routes/facility.ts`
- Modify: `server/src/routes/spots.ts`
- Modify: `server/src/routes/routes.ts`
- Modify: `server/src/routes/briefing.ts`

**Step 1: Update all route files that use requireManager**

In each file, replace:
```typescript
import { authenticate, requireManager, AuthRequest } from '../middleware/auth';
```
with:
```typescript
import { authenticate, requireAccessLevel, AuthRequest } from '../middleware/auth';
```

Then replace `requireManager` usage based on the permission matrix:

- **Assignments** (editing lineup/scheduling): `requireAccessLevel('OP_LEAD')` for create/update/delete
- **Templates** (editing lineup/scheduling): `requireAccessLevel('OP_LEAD')` for create/update/delete
- **Trucks** (moving trucks): `requireAccessLevel('TRUCK_MOVER')` for create/update/delete
- **Facility** (editing assignments): `requireAccessLevel('OP_LEAD')` for create/update/delete
- **Spots** (editing lineup): `requireAccessLevel('OP_LEAD')` for updates
- **Routes** (route management): `requireAccessLevel('HIGHEST_MANAGER')` for create/update/delete
- **Briefing** (editing): `requireAccessLevel('OP_LEAD')` for updates

**Step 2: Commit**

```bash
git add server/src/routes/
git commit -m "feat: update all server routes to use accessLevel-based permissions"
```

---

### Task 8: Update Seed Data — Add accessLevel to seeded users

**Files:**
- Modify: `server/prisma/seed.ts`

**Step 1: Update the admin user creation**

Add `accessLevel: 'HIGHEST_MANAGER'` to the admin user seed data.

**Step 2: Update other seeded users**

Add `accessLevel: 'EMPLOYEE'` to all driver/swing/CSA/handler users (or rely on the default).

**Step 3: Commit**

```bash
git add server/prisma/seed.ts
git commit -m "feat: add accessLevel to seed data"
```

---

### Task 9: Client — Update AuthContext and API types for accessLevel

**Files:**
- Modify: `client/app/contexts/AuthContext.tsx`
- Modify: `client/app/lib/api.ts` (no changes needed, already works)

**Step 1: Add accessLevel to User interface and AuthContextType**

```typescript
type AccessLevel = 'HIGHEST_MANAGER' | 'OP_LEAD' | 'TRUCK_MOVER' | 'EMPLOYEE';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'MANAGER' | 'DRIVER' | 'SWING' | 'CSA' | 'HANDLER';
  homeArea: 'FO' | 'DOC' | 'UNLOAD' | 'PULLER' | 'UNASSIGNED';
  accessLevel: AccessLevel;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isManager: boolean;         // Keep for backward compat, maps to HIGHEST_MANAGER
  isOpLead: boolean;          // OP_LEAD or higher
  isTruckMover: boolean;      // TRUCK_MOVER or higher
  accessLevel: AccessLevel | null;
  hasAccess: (level: AccessLevel) => boolean;
}
```

**Step 2: Add helper function and update provider value**

```typescript
const ACCESS_HIERARCHY: AccessLevel[] = ['HIGHEST_MANAGER', 'OP_LEAD', 'TRUCK_MOVER', 'EMPLOYEE'];

function hasAccessLevel(userLevel: AccessLevel | undefined, requiredLevel: AccessLevel): boolean {
  if (!userLevel) return false;
  return ACCESS_HIERARCHY.indexOf(userLevel) <= ACCESS_HIERARCHY.indexOf(requiredLevel);
}

// In the provider value:
const hasAccess = (level: AccessLevel) => hasAccessLevel(user?.accessLevel, level);

return (
  <AuthContext.Provider
    value={{
      user,
      isLoading,
      login,
      logout,
      isManager: hasAccessLevel(user?.accessLevel, 'HIGHEST_MANAGER'),
      isOpLead: hasAccessLevel(user?.accessLevel, 'OP_LEAD'),
      isTruckMover: hasAccessLevel(user?.accessLevel, 'TRUCK_MOVER'),
      accessLevel: user?.accessLevel || null,
      hasAccess,
    }}
  >
    {children}
  </AuthContext.Provider>
);
```

**Step 3: Commit**

```bash
git add client/app/contexts/AuthContext.tsx
git commit -m "feat: add accessLevel helpers to AuthContext"
```

---

### Task 10: Client — Update Layout/Navigation for access levels

**Files:**
- Modify: `client/app/components/Layout.tsx`

**Step 1: Update nav items to use access level checks**

Replace `isManager` references with the new access checks:

```typescript
const { user, logout, isManager, isOpLead, isTruckMover, hasAccess } = useAuth();

// Update pending count query to use isOpLead instead of isManager
const { data: pendingData } = useQuery({
  queryKey: ['timeoff-pending-count'],
  queryFn: async () => {
    const res = await api.get('/timeoff/pending-count');
    return res.data;
  },
  enabled: isOpLead,  // OP_LEAD+ can see pending time off
  refetchInterval: 60000,
});

const navItems = [
  { path: '/', label: 'Home', show: true },
  { path: '/facility', label: 'Facility', show: true },
  { path: '/truck-lineup', label: 'Truck Lineup', show: true },
  { path: '/routes', label: 'Routes', show: isManager },
  { path: '/people', label: 'People', show: isManager },
  { path: '/timeoff', label: 'Time Off', show: isOpLead, badge: pendingCount },
  { path: '/my-schedule', label: 'My Schedule', show: !isOpLead },
];
```

**Step 2: Commit**

```bash
git add client/app/components/Layout.tsx
git commit -m "feat: update navigation to use access level checks"
```

---

### Task 11: Client — Update People page to use invite flow

**Files:**
- Modify: `client/app/pages/People.tsx`
- Modify: `client/app/components/PersonModal.tsx`

**Step 1: Update People.tsx — Change "Add Person" button to "Invite Employee"**

Replace the button text and add a pending invites section. Update the page to show a tab or section for pending invites.

**Step 2: Update PersonModal.tsx — Convert to invite mode**

Remove the password field entirely. Add:
- Access level dropdown (HIGHEST_MANAGER, OP_LEAD, TRUCK_MOVER, EMPLOYEE)
- Primary manager dropdown (fetched from API, filtered to HIGHEST_MANAGER and OP_LEAD users)

Change the create mutation to call `POST /api/invites` instead of `POST /api/people`.

For editing, keep `PUT /api/people/:id` but add accessLevel and managerId fields.

The form for creating should:
1. Remove password field
2. Add access level select
3. Add manager select (dropdown of managers/op leads)
4. Change submit button to "Send Invite"
5. On success, show a message "Invite sent to {email}"

**Step 3: Add pending invites list to People page**

Add a query for `GET /api/invites/pending` and display pending invites with a "Resend" button for expired ones.

**Step 4: Commit**

```bash
git add client/app/pages/People.tsx client/app/components/PersonModal.tsx
git commit -m "feat: update People page to use invite flow with access levels and manager assignment"
```

---

### Task 12: Client — Create Invite Acceptance Page

**Files:**
- Create: `client/app/pages/AcceptInvite.tsx`
- Modify: `client/app/routes.ts` (add route)

**Step 1: Create the AcceptInvite page**

Create `client/app/pages/AcceptInvite.tsx`:

This page:
1. Reads `token` from the URL query params
2. Calls `GET /api/auth/validate-invite?token=...` to check token validity and get user info
3. Shows the user's name and a form with: password, confirm password, phone (optional, pre-filled if set)
4. On submit, calls `POST /api/auth/accept-invite` with token, password, phone
5. On success, stores the JWT token in localStorage and redirects to home

States to handle:
- Loading (validating token)
- Invalid/expired token (show error with message to contact manager)
- Form (valid token, show setup form)
- Success (redirect to home)

**Step 2: Add route in client/app/routes.ts**

Add before the layout wrapper (this is a public page, no auth needed):

```typescript
route("invite/accept", "./pages/AcceptInvite.tsx"),
```

**Step 3: Commit**

```bash
git add client/app/pages/AcceptInvite.tsx client/app/routes.ts
git commit -m "feat: add invite acceptance page for new employee onboarding"
```

---

### Task 13: Client — Update PersonDetail page with manager and access level info

**Files:**
- Modify: `client/app/pages/PersonDetail.tsx`

**Step 1: Display access level and assigned manager**

Add access level badge and primary manager name to the person detail view. If the viewer is HIGHEST_MANAGER, show dropdowns to change access level and reassign manager.

**Step 2: Commit**

```bash
git add client/app/pages/PersonDetail.tsx
git commit -m "feat: show access level and manager on person detail page"
```

---

### Task 14: Update Protected Layout — Gate routes by access level

**Files:**
- Modify: `client/app/layouts/protected.tsx`

**Step 1: Add access level checks for route protection**

The protected layout already redirects unauthenticated users. For now, the navigation already hides links based on access level (Task 10). Server-side protection (Tasks 5-7) prevents unauthorized API access. No additional client-side gating is strictly needed beyond hiding nav items, but you can optionally redirect users who manually navigate to restricted URLs.

**Step 2: Commit**

```bash
git add client/app/layouts/protected.tsx
git commit -m "feat: add optional client-side access level route gating"
```

---

### Task 15: Final Integration Test and Cleanup

**Step 1: Update server seed to create test users at each access level**

Add a few test users: one HIGHEST_MANAGER, one OP_LEAD, one TRUCK_MOVER, and existing employees stay as EMPLOYEE.

**Step 2: Test the full flow manually**

1. Log in as HIGHEST_MANAGER
2. Go to People page
3. Click "Invite Employee" — fill in details, select access level and manager
4. Check that invite email is sent (or logged if SMTP not configured)
5. Open the invite link in an incognito window
6. Set password and phone number
7. Verify you're logged in and see the correct navigation
8. Test that OP_LEAD can approve time off for their employees but not others
9. Test that TRUCK_MOVER can move trucks but can't access People or Time Off
10. Test that EMPLOYEE can only see their own schedule

**Step 3: Remove any remaining hardcoded `role === 'MANAGER'` checks**

Search the entire codebase for `role === 'MANAGER'` or `role: 'MANAGER'` and replace with appropriate `accessLevel` checks.

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete invite-only registration and access levels system"
```
