# People & Time Off Enhancements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a person detail page with editable info and time off balances, expand time off types, add work schedule support, balance tracking with annual reset, and manager notifications (in-app badge + email).

**Architecture:** Add fields to the existing User model (Prisma), expand TimeOffType enum, create a new person detail page route in React Router, add pending-count endpoint, and integrate Nodemailer for email notifications. Balance deductions happen on approval; lazy reset on June 1st.

**Tech Stack:** Prisma (PostgreSQL), Express.js, React 19, React Router 7, React Query, Tailwind CSS, Nodemailer

---

### Task 1: Prisma Schema Migration

**Files:**
- Modify: `server/prisma/schema.prisma`

**Step 1: Update the Prisma schema**

Add new enums and update existing ones. Add new fields to User model.

In `server/prisma/schema.prisma`, add the `WorkSchedule` enum after the existing `TimeOffType` enum (after line 35):

```prisma
enum WorkSchedule {
  MON_FRI
  TUE_SAT
}
```

Replace the `TimeOffType` enum (lines 31-35) with:

```prisma
enum TimeOffType {
  VACATION_WEEK
  VACATION_DAY
  PERSONAL
  HOLIDAY
  SICK
  SCHEDULED_OFF
}
```

Add new fields to the `User` model (after `homeArea` field, line 65):

```prisma
  workSchedule     WorkSchedule @default(MON_FRI)
  vacationWeeks    Int          @default(0)
  vacationDays     Int          @default(0)
  personalDays     Int          @default(0)
  holidays         Int          @default(0)
  sickDays         Int          @default(0)
  sickDayCarryover Int          @default(0)
  balanceResetDate DateTime     @default(now())
```

**Step 2: Create and run the migration**

Run:
```bash
cd server && npx prisma migrate dev --name add-timeoff-balances-and-work-schedule
```

Expected: Migration created and applied successfully. The old `VACATION` and `SICK` types in existing TimeOff records will need a data migration since the enum values are changing.

**Important:** If existing data uses the old `VACATION` type, the migration will need a custom SQL step. Prisma may generate a migration that drops and recreates the enum. Check the generated migration SQL. If needed, add manual SQL to convert:
- `VACATION` → `VACATION_DAY`
- `SICK` stays as `SICK`
- `SCHEDULED_OFF` stays as `SCHEDULED_OFF`

**Step 3: Commit**

```bash
git add server/prisma/schema.prisma server/prisma/migrations/
git commit -m "feat: add work schedule, time off balances, and expanded time off types to schema"
```

---

### Task 2: Install Nodemailer

**Files:**
- Modify: `server/package.json`

**Step 1: Install the dependency**

Run:
```bash
cd server && npm install nodemailer && npm install -D @types/nodemailer
```

**Step 2: Commit**

```bash
git add server/package.json server/package-lock.json
git commit -m "chore: add nodemailer dependency"
```

---

### Task 3: Create Email Utility

**Files:**
- Create: `server/src/utils/email.ts`

**Step 1: Create the email utility**

```typescript
import nodemailer from 'nodemailer';

const transporter =
  process.env.SMTP_HOST
    ? nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      })
    : null;

export async function sendEmail(to: string[], subject: string, html: string) {
  if (!transporter) {
    console.warn('SMTP not configured, skipping email');
    return;
  }

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@fedex-lineup.local',
      to: to.join(', '),
      subject,
      html,
    });
  } catch (error) {
    console.error('Failed to send email:', error);
  }
}
```

**Step 2: Commit**

```bash
git add server/src/utils/email.ts
git commit -m "feat: add email utility with nodemailer"
```

---

### Task 4: Add Balance Reset Helper

**Files:**
- Create: `server/src/utils/balance.ts`

**Step 1: Create the balance reset utility**

This implements lazy reset logic - called when reading a user's balances.

```typescript
import { prisma } from '../lib/prisma';

function getCurrentResetDate(): Date {
  const now = new Date();
  const year = now.getMonth() >= 5 ? now.getFullYear() : now.getFullYear() - 1;
  return new Date(year, 5, 1); // June 1st (month is 0-indexed)
}

export async function ensureBalancesReset(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;

  const currentResetDate = getCurrentResetDate();

  if (user.balanceResetDate < currentResetDate) {
    // Calculate sick day carryover: min(remaining sick days, 10)
    const approvedSickDays = await prisma.timeOff.count({
      where: {
        userId,
        type: 'SICK',
        status: 'APPROVED',
        date: { gte: user.balanceResetDate, lt: currentResetDate },
      },
    });
    const remainingSick = user.sickDays + user.sickDayCarryover - approvedSickDays;
    const carryover = Math.min(Math.max(remainingSick, 0), 10);

    return prisma.user.update({
      where: { id: userId },
      data: {
        vacationWeeks: 0,
        vacationDays: 0,
        personalDays: 0,
        holidays: 0,
        sickDays: 0,
        sickDayCarryover: carryover,
        balanceResetDate: currentResetDate,
      },
    });
  }

  return user;
}

export async function getUsedBalances(userId: string, sinceDate: Date) {
  const types = ['VACATION_WEEK', 'VACATION_DAY', 'PERSONAL', 'HOLIDAY', 'SICK'] as const;
  const result: Record<string, number> = {};

  for (const type of types) {
    result[type] = await prisma.timeOff.count({
      where: {
        userId,
        type,
        status: 'APPROVED',
        date: { gte: sinceDate },
      },
    });
  }

  // VACATION_WEEK: count unique weeks (groups of 5 days), divide by 5
  if (result['VACATION_WEEK'] > 0) {
    result['VACATION_WEEK'] = Math.ceil(result['VACATION_WEEK'] / 5);
  }

  return result;
}
```

**Step 2: Commit**

```bash
git add server/src/utils/balance.ts
git commit -m "feat: add balance reset and usage calculation utilities"
```

---

### Task 5: Update People Routes - GET /:id and PUT /:id

**Files:**
- Modify: `server/src/routes/people.ts`

**Step 1: Add GET /:id endpoint**

Add this route after the `GET /swing` route (after line 49) and before the `POST /` route:

```typescript
// Get person detail with balances and time off history
router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;

    // Non-managers can only view themselves
    if (req.user!.role !== 'MANAGER' && req.user!.userId !== id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await ensureBalancesReset(id);

    const person = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        homeArea: true,
        workSchedule: true,
        vacationWeeks: true,
        vacationDays: true,
        personalDays: true,
        holidays: true,
        sickDays: true,
        sickDayCarryover: true,
        balanceResetDate: true,
        isActive: true,
      },
    });

    if (!person) {
      return res.status(404).json({ error: 'Person not found' });
    }

    const used = await getUsedBalances(id, person.balanceResetDate);

    const timeOffs = await prisma.timeOff.findMany({
      where: { userId: id },
      orderBy: { date: 'desc' },
      take: 50,
    });

    res.json({ ...person, usedBalances: used, timeOffs });
  } catch (error) {
    console.error('Get person detail error:', error);
    res.status(500).json({ error: 'Failed to get person detail' });
  }
});
```

Add the imports at the top of the file:

```typescript
import { ensureBalancesReset, getUsedBalances } from '../utils/balance';
```

**Step 2: Update PUT /:id to support new fields**

Replace the existing PUT handler (lines 94-124) to include the new fields:

```typescript
router.put('/:id', authenticate, requireManager, async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    const {
      name, phone, email, role, homeArea, isActive, workSchedule,
      vacationWeeks, vacationDays, personalDays, holidays, sickDays,
    } = req.body;

    const user = await prisma.user.update({
      where: { id },
      data: {
        name,
        phone,
        email,
        role,
        homeArea,
        isActive,
        workSchedule,
        vacationWeeks,
        vacationDays,
        personalDays,
        holidays,
        sickDays,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        homeArea: true,
        phone: true,
        isActive: true,
        workSchedule: true,
        vacationWeeks: true,
        vacationDays: true,
        personalDays: true,
        holidays: true,
        sickDays: true,
        sickDayCarryover: true,
      },
    });

    res.json(user);
  } catch (error) {
    console.error('Update person error:', error);
    res.status(500).json({ error: 'Failed to update person' });
  }
});
```

**Important:** The `GET /:id` route MUST be placed after `GET /swing` but before `POST /` to avoid conflicts. Express matches routes in order, and `/swing` would match `/:id` otherwise.

**Step 3: Commit**

```bash
git add server/src/routes/people.ts
git commit -m "feat: add person detail endpoint and expand update with balance fields"
```

---

### Task 6: Update Time Off Routes

**Files:**
- Modify: `server/src/routes/timeoff.ts`

**Step 1: Add pending-count endpoint**

Add this route after the `GET /mine` route (after line 59):

```typescript
// Get pending time off count (for manager badge)
router.get('/pending-count', authenticate, requireManager, async (req: AuthRequest, res) => {
  try {
    const count = await prisma.timeOff.count({
      where: { status: 'PENDING' },
    });
    res.json({ count });
  } catch (error) {
    console.error('Get pending count error:', error);
    res.status(500).json({ error: 'Failed to get pending count' });
  }
});
```

**Step 2: Update POST /request to handle vacation weeks and send email**

Add imports at top:

```typescript
import { sendEmail } from '../utils/email';
```

Replace the existing `POST /request` handler (lines 62-101) with:

```typescript
router.post('/request', authenticate, async (req: AuthRequest, res) => {
  try {
    const { dates, type, note, startDate } = req.body;

    // For VACATION_WEEK, auto-generate 5 weekdays from startDate
    let datesToCreate: string[] = [];

    if (type === 'VACATION_WEEK') {
      if (!startDate) {
        return res.status(400).json({ error: 'Start date required for vacation week' });
      }

      const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
      if (!user) return res.status(404).json({ error: 'User not found' });

      const start = new Date(startDate);
      const dayOfWeek = start.getDay();

      // Validate start day matches work schedule
      if (user.workSchedule === 'MON_FRI' && dayOfWeek !== 1) {
        return res.status(400).json({ error: 'Vacation week must start on Monday for Mon-Fri schedule' });
      }
      if (user.workSchedule === 'TUE_SAT' && dayOfWeek !== 2) {
        return res.status(400).json({ error: 'Vacation week must start on Tuesday for Tue-Sat schedule' });
      }

      // Generate 5 consecutive days
      for (let i = 0; i < 5; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        datesToCreate.push(d.toISOString().split('T')[0]);
      }
    } else {
      if (!dates || !Array.isArray(dates) || dates.length === 0) {
        return res.status(400).json({ error: 'Dates array required' });
      }
      datesToCreate = dates;
    }

    if (!type) {
      return res.status(400).json({ error: 'Type required' });
    }

    const created = [];
    for (const dateStr of datesToCreate) {
      const date = new Date(dateStr);
      const existing = await prisma.timeOff.findUnique({
        where: { userId_date: { userId: req.user!.userId, date } },
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

    // Send email to all managers (fire-and-forget)
    const requester = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    const managers = await prisma.user.findMany({
      where: { role: 'MANAGER', isActive: true },
      select: { email: true },
    });

    if (managers.length > 0 && requester) {
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
        managers.map(m => m.email),
        `Time Off Request: ${requester.name}`,
        `<p><strong>${requester.name}</strong> has requested time off.</p>
         <p><strong>Type:</strong> ${typeLabels[type] || type}</p>
         <p><strong>Date(s):</strong> ${dateList}</p>
         <p>Please review this request in the Time Off management page.</p>`,
      );
    }

    res.status(201).json(created);
  } catch (error) {
    console.error('Request time off error:', error);
    res.status(500).json({ error: 'Failed to request time off' });
  }
});
```

**Step 3: Update PATCH /:id to handle balance deductions**

Replace the existing `PATCH /:id` handler (lines 104-131) with:

```typescript
router.patch('/:id', authenticate, requireManager, async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    const { status, note } = req.body;

    if (!status || !['APPROVED', 'DENIED'].includes(status)) {
      return res.status(400).json({ error: 'Valid status required' });
    }

    // Get current time off record to check previous status
    const existing = await prisma.timeOff.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Time off not found' });

    const timeOff = await prisma.timeOff.update({
      where: { id },
      data: { status, note },
      include: {
        user: { select: { id: true, name: true } },
      },
    });

    // Balance adjustments (skip for SCHEDULED_OFF)
    if (timeOff.type !== 'SCHEDULED_OFF') {
      const balanceField = {
        VACATION_WEEK: 'vacationWeeks',
        VACATION_DAY: 'vacationDays',
        PERSONAL: 'personalDays',
        HOLIDAY: 'holidays',
        SICK: 'sickDays',
      }[timeOff.type];

      // No direct balance deduction — balances are calculated from
      // approved records via getUsedBalances(). The "used" count
      // comes from counting approved TimeOff records, not from
      // decrementing a stored value. This keeps things consistent.
    }

    res.json(timeOff);
  } catch (error) {
    console.error('Update time off error:', error);
    res.status(500).json({ error: 'Failed to update time off' });
  }
});
```

**Note on balance approach:** Rather than incrementing/decrementing stored balance fields on approve/deny (which is error-prone), the `getUsedBalances()` function counts approved records dynamically. The stored fields (`vacationWeeks`, `sickDays`, etc.) represent the **allocated** amounts only. "Remaining" = allocated + carryover - used(approved count). This is simpler and avoids sync issues.

**Step 4: Update the type labels in the GET / route's include and the import route**

The import route (POST /import) references `type || 'SCHEDULED_OFF'` which still works. No change needed.

**Step 5: Commit**

```bash
git add server/src/routes/timeoff.ts
git commit -m "feat: add pending count, vacation week logic, email notifications, and balance-aware approval"
```

---

### Task 7: Add Person Detail Route (Frontend)

**Files:**
- Modify: `client/app/routes.ts`

**Step 1: Add the person detail route**

Add inside the protected layout array, after the people route (after line 10):

```typescript
    route("people/:id", "./pages/PersonDetail.tsx"),
```

**Step 2: Commit**

```bash
git add client/app/routes.ts
git commit -m "feat: add person detail route"
```

---

### Task 8: Create Person Detail Page

**Files:**
- Create: `client/app/pages/PersonDetail.tsx`

**Step 1: Create the PersonDetail page component**

```tsx
import { useState } from 'react';
import { useParams, Link } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, Check, X, Save } from 'lucide-react';

const roleLabels: Record<string, string> = {
  DRIVER: 'Driver', SWING: 'Swing', MANAGER: 'Manager', CSA: 'CSA', HANDLER: 'Handler',
};
const typeLabels: Record<string, string> = {
  VACATION_WEEK: 'Vacation Week', VACATION_DAY: 'Vacation Day', PERSONAL: 'Personal',
  HOLIDAY: 'Holiday', SICK: 'Sick', SCHEDULED_OFF: 'Scheduled Off',
};
const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  DENIED: 'bg-red-100 text-red-800',
};

export default function PersonDetail() {
  const { id } = useParams();
  const { isManager } = useAuth();
  const queryClient = useQueryClient();

  const { data: person, isLoading } = useQuery({
    queryKey: ['person', id],
    queryFn: async () => {
      const res = await api.get(`/people/${id}`);
      return res.data;
    },
  });

  const [infoForm, setInfoForm] = useState<any>(null);
  const [balanceForm, setBalanceForm] = useState<any>(null);

  // Initialize forms when data loads
  if (person && !infoForm) {
    setInfoForm({
      name: person.name,
      email: person.email,
      phone: person.phone || '',
      role: person.role,
      homeArea: person.homeArea,
      workSchedule: person.workSchedule,
    });
    setBalanceForm({
      vacationWeeks: person.vacationWeeks,
      vacationDays: person.vacationDays,
      personalDays: person.personalDays,
      holidays: person.holidays,
      sickDays: person.sickDays,
    });
  }

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      return api.put(`/people/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['person', id] });
    },
  });

  const timeoffMutation = useMutation({
    mutationFn: async ({ toId, status }: { toId: string; status: string }) => {
      return api.patch(`/timeoff/${toId}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['person', id] });
      queryClient.invalidateQueries({ queryKey: ['timeoffs'] });
    },
  });

  const handleSaveInfo = () => {
    if (infoForm) updateMutation.mutate(infoForm);
  };

  const handleSaveBalances = () => {
    if (balanceForm) updateMutation.mutate(balanceForm);
  };

  if (isLoading) {
    return <div className="text-center py-8 text-gray-500">Loading...</div>;
  }

  if (!person) {
    return <div className="text-center py-8 text-gray-500">Person not found</div>;
  }

  const balanceRows = [
    {
      label: 'Vacation Weeks',
      field: 'vacationWeeks',
      allocated: balanceForm?.vacationWeeks ?? 0,
      used: person.usedBalances?.VACATION_WEEK ?? 0,
      carryover: 0,
    },
    {
      label: 'Vacation Days',
      field: 'vacationDays',
      allocated: balanceForm?.vacationDays ?? 0,
      used: person.usedBalances?.VACATION_DAY ?? 0,
      carryover: 0,
    },
    {
      label: 'Personal Days',
      field: 'personalDays',
      allocated: balanceForm?.personalDays ?? 0,
      used: person.usedBalances?.PERSONAL ?? 0,
      carryover: 0,
    },
    {
      label: 'Holidays',
      field: 'holidays',
      allocated: balanceForm?.holidays ?? 0,
      used: person.usedBalances?.HOLIDAY ?? 0,
      carryover: 0,
    },
    {
      label: 'Sick Days',
      field: 'sickDays',
      allocated: balanceForm?.sickDays ?? 0,
      used: person.usedBalances?.SICK ?? 0,
      carryover: person.sickDayCarryover ?? 0,
    },
  ];

  return (
    <div className="space-y-6">
      <Link to="/people" className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm">
        <ArrowLeft size={16} /> Back to People
      </Link>

      <h1 className="text-2xl font-bold">{person.name}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Person Info Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Person Info</h2>
          {infoForm && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={infoForm.name}
                  onChange={(e) => setInfoForm({ ...infoForm, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  disabled={!isManager}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={infoForm.email}
                  onChange={(e) => setInfoForm({ ...infoForm, email: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  disabled={!isManager}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={infoForm.phone}
                  onChange={(e) => setInfoForm({ ...infoForm, phone: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  disabled={!isManager}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={infoForm.role}
                  onChange={(e) => setInfoForm({ ...infoForm, role: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  disabled={!isManager}
                >
                  <option value="DRIVER">Driver</option>
                  <option value="SWING">Swing Driver</option>
                  <option value="MANAGER">Manager</option>
                  <option value="CSA">CSA</option>
                  <option value="HANDLER">Handler</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Home Area</label>
                <select
                  value={infoForm.homeArea}
                  onChange={(e) => setInfoForm({ ...infoForm, homeArea: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  disabled={!isManager}
                >
                  <option value="FO">FO</option>
                  <option value="DOC">DOC</option>
                  <option value="UNLOAD">Unload</option>
                  <option value="PULLER">Puller</option>
                  <option value="UNASSIGNED">Unassigned</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Work Schedule</label>
                <select
                  value={infoForm.workSchedule}
                  onChange={(e) => setInfoForm({ ...infoForm, workSchedule: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  disabled={!isManager}
                >
                  <option value="MON_FRI">Mon - Fri</option>
                  <option value="TUE_SAT">Tue - Sat</option>
                </select>
              </div>
              {isManager && (
                <button
                  onClick={handleSaveInfo}
                  disabled={updateMutation.isPending}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  <Save size={16} />
                  {updateMutation.isPending ? 'Saving...' : 'Save Info'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Time Off Balances Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Time Off Balances</h2>
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs font-medium text-gray-500 uppercase">
                <th className="pb-2">Type</th>
                <th className="pb-2">Allocated</th>
                <th className="pb-2">Used</th>
                <th className="pb-2">Remaining</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {balanceRows.map((row) => {
                const remaining = row.allocated + row.carryover - row.used;
                return (
                  <tr key={row.field}>
                    <td className="py-2 text-sm font-medium">{row.label}</td>
                    <td className="py-2">
                      {isManager && balanceForm ? (
                        <input
                          type="number"
                          min={0}
                          value={balanceForm[row.field]}
                          onChange={(e) =>
                            setBalanceForm({ ...balanceForm, [row.field]: parseInt(e.target.value) || 0 })
                          }
                          className="w-16 px-2 py-1 border rounded text-sm"
                        />
                      ) : (
                        <span className="text-sm">{row.allocated}</span>
                      )}
                    </td>
                    <td className="py-2 text-sm">
                      {row.used}
                      {row.carryover > 0 && (
                        <span className="text-xs text-gray-500 ml-1">(+{row.carryover} carryover)</span>
                      )}
                    </td>
                    <td className={`py-2 text-sm font-medium ${remaining < 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {remaining}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {isManager && (
            <button
              onClick={handleSaveBalances}
              disabled={updateMutation.isPending}
              className="mt-4 flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              <Save size={16} />
              {updateMutation.isPending ? 'Saving...' : 'Save Balances'}
            </button>
          )}
        </div>
      </div>

      {/* Time Off History */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Time Off History</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Note</th>
                {isManager && (
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {person.timeOffs?.map((to: any) => (
                <tr key={to.id}>
                  <td className="px-4 py-3 text-sm">{new Date(to.date).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-sm">{typeLabels[to.type] || to.type}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs rounded-full ${statusColors[to.status]}`}>
                      {to.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{to.note || '-'}</td>
                  {isManager && (
                    <td className="px-4 py-3 text-right">
                      {to.status === 'PENDING' && (
                        <>
                          <button
                            onClick={() => timeoffMutation.mutate({ toId: to.id, status: 'APPROVED' })}
                            className="text-green-600 hover:text-green-800 mr-2"
                            title="Approve"
                          >
                            <Check size={16} />
                          </button>
                          <button
                            onClick={() => timeoffMutation.mutate({ toId: to.id, status: 'DENIED' })}
                            className="text-red-600 hover:text-red-800"
                            title="Deny"
                          >
                            <X size={16} />
                          </button>
                        </>
                      )}
                    </td>
                  )}
                </tr>
              ))}
              {(!person.timeOffs || person.timeOffs.length === 0) && (
                <tr>
                  <td colSpan={isManager ? 5 : 4} className="px-4 py-8 text-center text-gray-500">
                    No time off records
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add client/app/pages/PersonDetail.tsx
git commit -m "feat: create person detail page with info, balances, and time off history"
```

---

### Task 9: Update People Page - Names as Links

**Files:**
- Modify: `client/app/pages/People.tsx`

**Step 1: Add Link import and make names clickable**

Add `Link` to the import from react-router (line 1 area). Then replace the name `<td>` (line 106-108) to use a Link:

Change:
```tsx
<td className="px-6 py-4 whitespace-nowrap font-medium">
  {person.name}
</td>
```

To:
```tsx
<td className="px-6 py-4 whitespace-nowrap font-medium">
  <Link to={`/people/${person.id}`} className="text-blue-600 hover:text-blue-800 hover:underline">
    {person.name}
  </Link>
</td>
```

**Step 2: Commit**

```bash
git add client/app/pages/People.tsx
git commit -m "feat: make person names link to detail page"
```

---

### Task 10: Update MySchedule - Expanded Types and Vacation Week

**Files:**
- Modify: `client/app/pages/MySchedule.tsx`

**Step 1: Update the time off request form**

Replace the `requestType` default value (line 17):
```tsx
const [requestType, setRequestType] = useState<string>('VACATION_DAY');
```

Add state for vacation week start date after existing state:
```tsx
const [vacationWeekStart, setVacationWeekStart] = useState<string>('');
```

Add a query to get the user's balances:
```tsx
const { data: myBalances } = useQuery({
  queryKey: ['my-balances'],
  queryFn: async () => {
    const res = await api.get('/auth/me');
    return res.data;
  },
});
```

**Note:** We need to check if `/auth/me` returns balance fields. If not, we'll need to use the person detail endpoint. The user can access their own detail via `GET /people/:id` since we added self-access in Task 5. Use the user ID from auth context.

Update the submit handler to support vacation week:
```tsx
const handleSubmitRequest = (e: React.FormEvent) => {
  e.preventDefault();
  if (requestType === 'VACATION_WEEK') {
    if (!vacationWeekStart) return;
    requestMutation.mutate({ dates: [], type: requestType, startDate: vacationWeekStart });
  } else {
    if (requestDates.length === 0) return;
    requestMutation.mutate({ dates: requestDates, type: requestType });
  }
};
```

Update the mutation type:
```tsx
const requestMutation = useMutation({
  mutationFn: async (data: { dates: string[]; type: string; startDate?: string }) => {
    return api.post('/timeoff/request', data);
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['my-timeoffs'] });
    setShowRequestForm(false);
    setRequestDates([]);
    setVacationWeekStart('');
  },
});
```

Update the type dropdown options (replace lines 170-178):
```tsx
<select
  value={requestType}
  onChange={(e) => setRequestType(e.target.value)}
  className="w-full px-3 py-2 border rounded-md"
>
  <option value="VACATION_WEEK">Vacation Week</option>
  <option value="VACATION_DAY">Vacation Day</option>
  <option value="PERSONAL">Personal</option>
  <option value="HOLIDAY">Holiday</option>
  <option value="SICK">Sick</option>
  <option value="SCHEDULED_OFF">Scheduled Off</option>
</select>
```

Update the date input area (lines 135-165) to conditionally show either a single date picker (for vacation week) or the multi-date picker:

```tsx
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">
    {requestType === 'VACATION_WEEK' ? 'Week Start Date' : 'Date(s)'}
  </label>
  {requestType === 'VACATION_WEEK' ? (
    <input
      type="date"
      value={vacationWeekStart}
      onChange={(e) => setVacationWeekStart(e.target.value)}
      className="w-full px-3 py-2 border rounded-md"
    />
  ) : (
    <>
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
          <span key={d} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
            {new Date(d).toLocaleDateString()}
            <button type="button" onClick={() => setRequestDates(requestDates.filter((x) => x !== d))} className="ml-1">x</button>
          </span>
        ))}
      </div>
    </>
  )}
</div>
```

Update the submit button disabled condition:
```tsx
disabled={
  (requestType === 'VACATION_WEEK' ? !vacationWeekStart : requestDates.length === 0) ||
  requestMutation.isPending
}
```

Also update the type label display in the time off list (line 195):
```tsx
<span className="text-sm text-gray-500">
  {({ VACATION_WEEK: 'Vacation Week', VACATION_DAY: 'Vacation Day', PERSONAL: 'Personal', HOLIDAY: 'Holiday', SICK: 'Sick', SCHEDULED_OFF: 'Scheduled Off' })[to.type] || to.type}
</span>
```

**Step 2: Commit**

```bash
git add client/app/pages/MySchedule.tsx
git commit -m "feat: update MySchedule with expanded time off types and vacation week support"
```

---

### Task 11: Update TimeOff Page - New Type Labels

**Files:**
- Modify: `client/app/pages/TimeOff.tsx`

**Step 1: Update type labels**

Replace the typeLabels object (line 44):

```tsx
const typeLabels: Record<string, string> = {
  VACATION_WEEK: 'Vacation Week',
  VACATION_DAY: 'Vacation Day',
  PERSONAL: 'Personal',
  HOLIDAY: 'Holiday',
  SICK: 'Sick',
  SCHEDULED_OFF: 'Scheduled Off',
};
```

**Step 2: Commit**

```bash
git add client/app/pages/TimeOff.tsx
git commit -m "feat: update TimeOff page with expanded type labels"
```

---

### Task 12: Update Layout - Pending Request Badge

**Files:**
- Modify: `client/app/components/Layout.tsx`

**Step 1: Add the pending count query and badge**

Add imports at top:
```tsx
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
```

Inside the `AppLayout` component, add the pending count query:
```tsx
const { data: pendingData } = useQuery({
  queryKey: ['timeoff-pending-count'],
  queryFn: async () => {
    const res = await api.get('/timeoff/pending-count');
    return res.data;
  },
  enabled: isManager,
  refetchInterval: 60000, // Poll every 60 seconds
});

const pendingCount = pendingData?.count ?? 0;
```

Update the Time Off nav item (line 22) to include the badge count:

Replace the navItems array or update the Time Off entry. Change the label for the Time Off item to be dynamic:

```tsx
{ path: '/timeoff', label: 'Time Off', show: isManager, badge: pendingCount },
```

Update the navItems type to include optional badge. Then in the desktop nav Link rendering, add the badge:

```tsx
{navItems
  .filter((item) => item.show)
  .map((item) => (
    <Link
      key={item.path}
      to={item.path}
      className={`relative text-sm font-medium ${
        location.pathname === item.path
          ? 'text-blue-600'
          : 'text-gray-600 hover:text-gray-900'
      }`}
    >
      {item.label}
      {item.badge ? (
        <span className="absolute -top-2 -right-4 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
          {item.badge}
        </span>
      ) : null}
    </Link>
  ))}
```

Apply the same badge rendering for the mobile nav.

**Step 2: Commit**

```bash
git add client/app/components/Layout.tsx
git commit -m "feat: add pending time off request badge to nav for managers"
```

---

### Task 13: Update PersonModal - Add Work Schedule

**Files:**
- Modify: `client/app/components/PersonModal.tsx`

**Step 1: Add workSchedule and homeArea to the form**

Add `homeArea` and `workSchedule` to the formData state (around line 23):

```tsx
const [formData, setFormData] = useState({
  name: person?.name || '',
  email: person?.email || '',
  phone: person?.phone || '',
  password: '',
  role: person?.role || 'DRIVER',
  homeArea: person?.homeArea || 'UNASSIGNED',
  workSchedule: person?.workSchedule || 'MON_FRI',
});
```

Update the Person interface to include the new fields:

```tsx
interface Person {
  id?: string;
  name: string;
  email: string;
  phone?: string;
  role: 'DRIVER' | 'SWING' | 'MANAGER' | 'CSA' | 'HANDLER';
  homeArea?: string;
  workSchedule?: string;
}
```

Add homeArea and workSchedule dropdowns to the form (after the Role dropdown, before the submit button):

```tsx
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">Home Area</label>
  <select
    value={formData.homeArea}
    onChange={(e) => setFormData({ ...formData, homeArea: e.target.value })}
    className="w-full px-3 py-2 border rounded-md"
  >
    <option value="FO">FO</option>
    <option value="DOC">DOC</option>
    <option value="UNLOAD">Unload</option>
    <option value="PULLER">Puller</option>
    <option value="UNASSIGNED">Unassigned</option>
  </select>
</div>

<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">Work Schedule</label>
  <select
    value={formData.workSchedule}
    onChange={(e) => setFormData({ ...formData, workSchedule: e.target.value })}
    className="w-full px-3 py-2 border rounded-md"
  >
    <option value="MON_FRI">Mon - Fri</option>
    <option value="TUE_SAT">Tue - Sat</option>
  </select>
</div>
```

Update the handleSubmit to include homeArea and workSchedule in the update data:

```tsx
const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  if (isEditing) {
    const { password, email, ...updateData } = formData;
    updateMutation.mutate(updateData);
  } else {
    createMutation.mutate(formData);
  }
};
```

The existing spread already includes them since they're in formData. Just make sure the POST /people endpoint on the server accepts `workSchedule`. Check: the create endpoint (lines 52-91 in people.ts) destructures `{ email, password, name, phone, role, homeArea }` — we need to add `workSchedule` there too.

**Step 2: Update server POST /people to accept workSchedule**

In `server/src/routes/people.ts`, update the create route to include workSchedule:

```typescript
const { email, password, name, phone, role, homeArea, workSchedule } = req.body;
```

And add it to the create data:
```typescript
data: {
  email,
  password: hashedPassword,
  name,
  phone,
  role,
  homeArea,
  workSchedule,
},
```

**Step 3: Commit**

```bash
git add client/app/components/PersonModal.tsx server/src/routes/people.ts
git commit -m "feat: add work schedule and home area to PersonModal and create endpoint"
```

---

### Task 14: Final Verification

**Step 1: Run the server and check for TypeScript errors**

```bash
cd server && npx tsc --noEmit
```

Expected: No errors.

**Step 2: Run the client build**

```bash
cd client && npm run build
```

Expected: Build succeeds.

**Step 3: Manual testing checklist**

1. Navigate to People page — names should be clickable links
2. Click a name — should go to `/people/:id` with info card, balances, and history
3. Edit person info and save — should persist
4. Edit balance allocations and save — should persist
5. Request time off on MySchedule — new types should appear in dropdown
6. Select "Vacation Week" — should show single date picker
7. Submit a request — should appear as PENDING on TimeOff page
8. Check nav — Time Off link should show pending count badge
9. Approve/deny from TimeOff page or PersonDetail — should work
10. Check PersonDetail — "Used" and "Remaining" should update after approval

**Step 4: Commit any fixes and final commit**

```bash
git add -A
git commit -m "fix: address any issues found during verification"
```
