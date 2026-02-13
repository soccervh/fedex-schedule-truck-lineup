# Routes, Homepage, and Navigation Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a Routes management page, a daily operations briefing homepage, restructure navigation, move Facility to `/facility`, and clean up the People page.

**Architecture:** Five independent work streams: (1) DB schema changes for Route and DailyBriefing models, (2) server API routes for routes + briefing, (3) client nav/layout restructuring, (4) new Routes and Homepage pages, (5) People page cleanup. Backend first, then frontend.

**Tech Stack:** Prisma (PostgreSQL), Express.js, React 19, React Router v7, TanStack Query, Tailwind CSS, lucide-react icons.

---

### Task 1: Add Route and DailyBriefing models to Prisma schema

**Files:**
- Modify: `server/prisma/schema.prisma`

**Step 1: Add the RouteArea enum and Route model to schema.prisma**

Add after the `TruckStatus` enum (line ~41):

```prisma
enum RouteArea {
  EO_POOL
  UNLOAD
  DOCK
  BELT_SPOT
}
```

Add after the `TruckSpotAssignment` model (end of file):

```prisma
model Route {
  id           Int       @id @default(autoincrement())
  number       String    @unique
  assignedArea RouteArea
  beltSpotId   Int?
  beltSpot     Spot?     @relation(fields: [beltSpotId], references: [id])
  isActive     Boolean   @default(true)
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
}

model DailyBriefing {
  id           String   @id @default(cuid())
  date         DateTime @unique @db.Date
  startTime    String?
  planeArrival String?
  lateFreight  String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

**Step 2: Add the `routes` relation to the Spot model**

In the `Spot` model (around line ~69), add to the relations list:

```prisma
  routes               Route[]
```

Add it after the `truckAssignments` line.

**Step 3: Run the migration**

Run: `cd server && npx prisma migrate dev --name add-route-and-daily-briefing`

Expected: Migration created and applied successfully.

**Step 4: Verify Prisma client generated**

Run: `cd server && npx prisma generate`

Expected: Prisma Client generated successfully.

**Step 5: Commit**

```bash
git add server/prisma/schema.prisma server/prisma/migrations/
git commit -m "feat: add Route and DailyBriefing models to schema"
```

---

### Task 2: Create server API routes for Routes CRUD

**Files:**
- Create: `server/src/routes/routes.ts`
- Modify: `server/src/index.ts`

**Step 1: Create the routes API file**

Create `server/src/routes/routes.ts`:

```typescript
import { Router } from 'express';
import { authenticate, requireManager, AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';

const router = Router();

// Get all active routes (all users)
router.get('/', authenticate, async (req, res) => {
  try {
    const routes = await prisma.route.findMany({
      where: { isActive: true },
      include: {
        beltSpot: {
          include: {
            belt: { select: { letter: true } },
          },
        },
      },
      orderBy: { number: 'asc' },
    });
    res.json(routes);
  } catch (error) {
    console.error('Get routes error:', error);
    res.status(500).json({ error: 'Failed to get routes' });
  }
});

// Create route (manager only)
router.post('/', authenticate, requireManager, async (req: AuthRequest, res) => {
  try {
    const { number, assignedArea, beltSpotId } = req.body;

    if (!number || !assignedArea) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (assignedArea === 'BELT_SPOT' && !beltSpotId) {
      return res.status(400).json({ error: 'Belt spot required when area is BELT_SPOT' });
    }

    const existing = await prisma.route.findUnique({ where: { number } });
    if (existing) {
      return res.status(409).json({ error: 'Route number already exists' });
    }

    const route = await prisma.route.create({
      data: {
        number,
        assignedArea,
        beltSpotId: assignedArea === 'BELT_SPOT' ? beltSpotId : null,
      },
      include: {
        beltSpot: {
          include: {
            belt: { select: { letter: true } },
          },
        },
      },
    });

    res.status(201).json(route);
  } catch (error) {
    console.error('Create route error:', error);
    res.status(500).json({ error: 'Failed to create route' });
  }
});

// Update route (manager only)
router.put('/:id', authenticate, requireManager, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const { number, assignedArea, beltSpotId } = req.body;

    if (assignedArea === 'BELT_SPOT' && !beltSpotId) {
      return res.status(400).json({ error: 'Belt spot required when area is BELT_SPOT' });
    }

    const route = await prisma.route.update({
      where: { id },
      data: {
        number,
        assignedArea,
        beltSpotId: assignedArea === 'BELT_SPOT' ? beltSpotId : null,
      },
      include: {
        beltSpot: {
          include: {
            belt: { select: { letter: true } },
          },
        },
      },
    });

    res.json(route);
  } catch (error) {
    console.error('Update route error:', error);
    res.status(500).json({ error: 'Failed to update route' });
  }
});

// Deactivate route (manager only)
router.delete('/:id', authenticate, requireManager, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);

    await prisma.route.update({
      where: { id },
      data: { isActive: false },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Deactivate route error:', error);
    res.status(500).json({ error: 'Failed to deactivate route' });
  }
});

export default router;
```

**Step 2: Register route in server index**

In `server/src/index.ts`, add the import (after line 12):

```typescript
import routeRoutes from './routes/routes';
```

Add the route mount (after line 34, the spots route):

```typescript
app.use('/api/routes', routeRoutes);
```

**Step 3: Verify server compiles**

Run: `cd server && npx tsc --noEmit`

Expected: No errors.

**Step 4: Commit**

```bash
git add server/src/routes/routes.ts server/src/index.ts
git commit -m "feat: add Routes CRUD API endpoints"
```

---

### Task 3: Create server API routes for DailyBriefing

**Files:**
- Create: `server/src/routes/briefing.ts`
- Modify: `server/src/index.ts`

**Step 1: Create the briefing API file**

Create `server/src/routes/briefing.ts`:

```typescript
import { Router } from 'express';
import { authenticate, requireManager, AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';

const router = Router();

// Get briefing for date (all users)
router.get('/', authenticate, async (req, res) => {
  try {
    const dateStr = req.query.date as string;
    if (!dateStr) {
      return res.status(400).json({ error: 'Date parameter required' });
    }

    const date = new Date(dateStr + 'T00:00:00.000Z');

    const briefing = await prisma.dailyBriefing.findUnique({
      where: { date },
    });

    // Return empty object if no briefing exists yet
    res.json(briefing || { date: dateStr, startTime: null, planeArrival: null, lateFreight: null });
  } catch (error) {
    console.error('Get briefing error:', error);
    res.status(500).json({ error: 'Failed to get briefing' });
  }
});

// Create/update briefing for date (manager only)
router.put('/', authenticate, requireManager, async (req: AuthRequest, res) => {
  try {
    const { date: dateStr, startTime, planeArrival, lateFreight } = req.body;

    if (!dateStr) {
      return res.status(400).json({ error: 'Date required' });
    }

    const date = new Date(dateStr + 'T00:00:00.000Z');

    const briefing = await prisma.dailyBriefing.upsert({
      where: { date },
      update: { startTime, planeArrival, lateFreight },
      create: { date, startTime, planeArrival, lateFreight },
    });

    res.json(briefing);
  } catch (error) {
    console.error('Update briefing error:', error);
    res.status(500).json({ error: 'Failed to update briefing' });
  }
});

export default router;
```

**Step 2: Register route in server index**

In `server/src/index.ts`, add the import:

```typescript
import briefingRoutes from './routes/briefing';
```

Add the route mount:

```typescript
app.use('/api/briefing', briefingRoutes);
```

**Step 3: Verify server compiles**

Run: `cd server && npx tsc --noEmit`

Expected: No errors.

**Step 4: Commit**

```bash
git add server/src/routes/briefing.ts server/src/index.ts
git commit -m "feat: add DailyBriefing API endpoints"
```

---

### Task 4: Update navigation and routing structure

**Files:**
- Modify: `client/app/routes.ts`
- Modify: `client/app/components/Layout.tsx`

**Step 1: Update routes.ts to add new routes and move facility**

Replace the entire content of `client/app/routes.ts`:

```typescript
import { type RouteConfig, route, index, layout } from "@react-router/dev/routes";

export default [
  route("login", "./pages/Login.tsx"),
  layout("./layouts/protected.tsx", [
    index("./pages/HomePage.tsx"),
    route("facility", "./pages/FacilityPage.tsx"),
    route("truck-lineup", "./pages/TruckLineupPage.tsx"),
    route("routes", "./pages/Routes.tsx"),
    route("people", "./pages/People.tsx"),
    route("timeoff", "./pages/TimeOff.tsx"),
    route("my-schedule", "./pages/MySchedule.tsx"),
  ]),
] satisfies RouteConfig;
```

**Step 2: Update Layout.tsx header and nav**

Replace the entire content of `client/app/components/Layout.tsx`:

```tsx
import { useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { Home } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: LayoutProps) {
  const { user, logout, isManager } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const navItems = [
    { path: '/', label: 'Home', show: true },
    { path: '/facility', label: 'Facility', show: true },
    { path: '/truck-lineup', label: 'Truck Lineup', show: true },
    { path: '/routes', label: 'Routes', show: isManager },
    { path: '/people', label: 'People', show: isManager },
    { path: '/timeoff', label: 'Time Off', show: isManager },
    { path: '/my-schedule', label: 'My Schedule', show: !isManager },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center py-3">
            <div className="flex items-center gap-2 shrink-0">
              <Link to="/" className="text-gray-600 hover:text-blue-600">
                <Home size={22} />
              </Link>
              <h1 className="text-lg font-bold text-gray-900">
                FedEx
              </h1>
            </div>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-6">
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

            {/* Mobile hamburger */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-2 text-gray-600"
              aria-label="Toggle menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {menuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>

          {/* Mobile menu */}
          {menuOpen && (
            <div className="md:hidden border-t pb-3">
              {navItems
                .filter((item) => item.show)
                .map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMenuOpen(false)}
                    className={`block py-2 px-2 text-sm font-medium ${
                      location.pathname === item.path
                        ? 'text-blue-600'
                        : 'text-gray-600'
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              <div className="flex items-center justify-between px-2 pt-2 mt-2 border-t">
                <span className="text-sm text-gray-600">{user?.name}</span>
                <button
                  onClick={logout}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </header>
      <main className="max-w-7xl mx-auto py-4 px-3 md:py-6 md:px-4">{children}</main>
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add client/app/routes.ts client/app/components/Layout.tsx
git commit -m "feat: restructure nav with home icon, rename to FedEx, add routes/facility paths"
```

---

### Task 5: Create the Homepage (Daily Operations Briefing)

**Files:**
- Create: `client/app/pages/HomePage.tsx`

**Step 1: Create HomePage.tsx**

Create `client/app/pages/HomePage.tsx`:

```tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Pencil, Check, X } from 'lucide-react';

interface Briefing {
  date: string;
  startTime: string | null;
  planeArrival: string | null;
  lateFreight: string | null;
}

interface RouteChange {
  routeNumber: string;
  defaultArea: string;
  currentArea: string;
}

export default function HomePage() {
  const { isManager } = useAuth();
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split('T')[0];

  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const { data: briefing } = useQuery({
    queryKey: ['briefing', today],
    queryFn: async () => {
      const res = await api.get(`/briefing?date=${today}`);
      return res.data as Briefing;
    },
  });

  const { data: routes } = useQuery({
    queryKey: ['routes'],
    queryFn: async () => {
      const res = await api.get('/routes');
      return res.data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<Briefing> & { date: string }) => {
      return api.put('/briefing', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['briefing', today] });
      setEditingField(null);
    },
  });

  const startEdit = (field: string, currentValue: string | null) => {
    setEditingField(field);
    setEditValue(currentValue || '');
  };

  const saveEdit = (field: string) => {
    updateMutation.mutate({
      date: today,
      [field]: editValue || null,
    });
  };

  const cancelEdit = () => {
    setEditingField(null);
    setEditValue('');
  };

  const renderField = (label: string, field: keyof Briefing, value: string | null) => (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">{label}</h3>
        {isManager && editingField !== field && (
          <button
            onClick={() => startEdit(field, value)}
            className="text-gray-400 hover:text-blue-600"
          >
            <Pencil size={16} />
          </button>
        )}
      </div>
      {editingField === field ? (
        <div className="flex items-center gap-2">
          {field === 'lateFreight' ? (
            <textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="flex-1 px-3 py-2 border rounded-md text-lg"
              rows={3}
              autoFocus
            />
          ) : (
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="flex-1 px-3 py-2 border rounded-md text-lg"
              placeholder={field === 'startTime' ? 'e.g. 3:30 AM' : 'e.g. 4:15 AM'}
              autoFocus
            />
          )}
          <button
            onClick={() => saveEdit(field)}
            className="text-green-600 hover:text-green-700 p-1"
          >
            <Check size={20} />
          </button>
          <button
            onClick={cancelEdit}
            className="text-gray-400 hover:text-red-600 p-1"
          >
            <X size={20} />
          </button>
        </div>
      ) : (
        <p className={`text-2xl font-semibold ${value ? 'text-gray-900' : 'text-gray-300'}`}>
          {value || 'Not set'}
        </p>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Daily Briefing</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {renderField('Start Time', 'startTime', briefing?.startTime ?? null)}
        {renderField('Plane Arrival', 'planeArrival', briefing?.planeArrival ?? null)}
      </div>

      {renderField('Late Freight', 'lateFreight', briefing?.lateFreight ?? null)}

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">
          Route Changes Today
        </h3>
        <p className="text-gray-400 text-sm">
          Route change detection will show here when routes differ from their default assignments.
        </p>
      </div>
    </div>
  );
}
```

**Step 2: Verify the app compiles**

Run: `cd client && npx react-router build` (or just check types with `npx tsc --noEmit`)

Expected: No errors.

**Step 3: Commit**

```bash
git add client/app/pages/HomePage.tsx
git commit -m "feat: add daily operations briefing homepage"
```

---

### Task 6: Create the Routes management page

**Files:**
- Create: `client/app/pages/Routes.tsx`
- Create: `client/app/components/RouteModal.tsx`

**Step 1: Create RouteModal.tsx**

Create `client/app/components/RouteModal.tsx`:

```tsx
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { X } from 'lucide-react';

interface RouteData {
  id?: number;
  number: string;
  assignedArea: 'EO_POOL' | 'UNLOAD' | 'DOCK' | 'BELT_SPOT';
  beltSpotId?: number | null;
}

interface RouteModalProps {
  route?: RouteData;
  onClose: () => void;
}

export function RouteModal({ route, onClose }: RouteModalProps) {
  const queryClient = useQueryClient();
  const isEditing = !!route?.id;

  const [formData, setFormData] = useState({
    number: route?.number || '',
    assignedArea: route?.assignedArea || 'EO_POOL' as const,
    beltSpotId: route?.beltSpotId || null as number | null,
  });

  const { data: belts } = useQuery({
    queryKey: ['belts-for-routes'],
    queryFn: async () => {
      const res = await api.get('/belts');
      return res.data;
    },
    enabled: formData.assignedArea === 'BELT_SPOT',
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return api.post('/routes', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routes'] });
      onClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return api.put(`/routes/${route?.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routes'] });
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditing) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  // Build belt spot options from belts data
  const beltSpotOptions: { id: number; label: string }[] = [];
  if (belts) {
    for (const belt of belts) {
      for (const spot of belt.spots || []) {
        beltSpotOptions.push({
          id: spot.id,
          label: `Belt ${belt.letter} - Spot ${spot.number}`,
        });
      }
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">
            {isEditing ? 'Edit Route' : 'Add Route'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Route Number
            </label>
            <input
              type="text"
              value={formData.number}
              onChange={(e) => setFormData({ ...formData, number: e.target.value })}
              className="w-full px-3 py-2 border rounded-md"
              placeholder="e.g. 101"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Assigned Area
            </label>
            <select
              value={formData.assignedArea}
              onChange={(e) => setFormData({
                ...formData,
                assignedArea: e.target.value as any,
                beltSpotId: e.target.value !== 'BELT_SPOT' ? null : formData.beltSpotId,
              })}
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="EO_POOL">EO Pool</option>
              <option value="UNLOAD">Unload</option>
              <option value="DOCK">Dock</option>
              <option value="BELT_SPOT">Belt Spot</option>
            </select>
          </div>

          {formData.assignedArea === 'BELT_SPOT' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Belt Spot
              </label>
              <select
                value={formData.beltSpotId || ''}
                onChange={(e) => setFormData({ ...formData, beltSpotId: parseInt(e.target.value) || null })}
                className="w-full px-3 py-2 border rounded-md"
                required
              >
                <option value="">Select a spot...</option>
                {beltSpotOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>{opt.label}</option>
                ))}
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isPending ? 'Saving...' : isEditing ? 'Update Route' : 'Add Route'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

**Step 2: Create Routes.tsx page**

Create `client/app/pages/Routes.tsx`:

```tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { RouteModal } from '../components/RouteModal';
import { Plus, Pencil, Trash2 } from 'lucide-react';

const areaLabels: Record<string, string> = {
  EO_POOL: 'EO Pool',
  UNLOAD: 'Unload',
  DOCK: 'Dock',
  BELT_SPOT: 'Belt Spot',
};

export default function Routes() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingRoute, setEditingRoute] = useState<any>(null);

  const { data: routes, isLoading } = useQuery({
    queryKey: ['routes'],
    queryFn: async () => {
      const res = await api.get('/routes');
      return res.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return api.delete(`/routes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routes'] });
    },
  });

  const handleEdit = (route: any) => {
    setEditingRoute(route);
    setShowModal(true);
  };

  const handleDelete = (id: number) => {
    if (confirm('Deactivate this route?')) {
      deleteMutation.mutate(id);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingRoute(null);
  };

  const getAreaDisplay = (route: any) => {
    if (route.assignedArea === 'BELT_SPOT' && route.beltSpot) {
      return `Belt ${route.beltSpot.belt.letter} - Spot ${route.beltSpot.number}`;
    }
    return areaLabels[route.assignedArea] || route.assignedArea;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Routes</h1>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          <Plus size={18} />
          Add Route
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-gray-500">Loading...</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Route Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Assigned Area
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {routes?.map((route: any) => (
                <tr key={route.id}>
                  <td className="px-6 py-4 whitespace-nowrap font-medium">
                    {route.number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700">
                      {getAreaDisplay(route)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button
                      onClick={() => handleEdit(route)}
                      className="text-gray-400 hover:text-blue-600 mr-3"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(route.id)}
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

      {showModal && <RouteModal route={editingRoute} onClose={closeModal} />}
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add client/app/pages/Routes.tsx client/app/components/RouteModal.tsx
git commit -m "feat: add Routes management page with CRUD modal"
```

---

### Task 7: Clean up People page — remove Home Area

**Files:**
- Modify: `client/app/pages/People.tsx`
- Modify: `client/app/components/PersonModal.tsx`

**Step 1: Remove Home Area from People.tsx**

In `client/app/pages/People.tsx`:

1. Remove `areaLabels` from line 8.
2. Remove the `homeArea` query state (line 16): delete `const [homeArea, setHomeArea] = useQueryState('homeArea', { defaultValue: '' });`
3. Remove the homeArea filter in `filteredPeople` (line 37): delete `if (homeArea && p.homeArea !== homeArea) return false;`
4. Remove the Home Area dropdown `<select>` (lines 83-94).
5. Remove the Home Area `<th>` header (lines 113-115).
6. Remove the Home Area `<td>` cell (lines 141-143).

The resulting table should have columns: Name, Email, Role, Actions only.

**Step 2: Remove Home Area from PersonModal.tsx**

In `client/app/components/PersonModal.tsx`:

1. Remove `homeArea` from the `Person` interface (line 12).
2. Remove `homeArea` from the `formData` state (line 30): delete `homeArea: person?.homeArea || 'UNASSIGNED',`
3. Remove the entire "Secondary Role" `<div>` block (lines 149-164) — the second column in the grid. Change the `grid grid-cols-2 gap-4` div to just a regular `<div>` since it only has one item (Role).

**Step 3: Verify the app compiles**

Run: `cd client && npx tsc --noEmit`

Expected: No errors.

**Step 4: Commit**

```bash
git add client/app/pages/People.tsx client/app/components/PersonModal.tsx
git commit -m "feat: remove Home Area from People page and PersonModal"
```

---

### Task 8: Update belts API to return spots for route assignment dropdown

**Files:**
- Modify: `server/src/routes/belts.ts` (if needed)

**Step 1: Check that GET /api/belts returns spots**

Read `server/src/routes/belts.ts` and verify the `GET /` endpoint returns belts with their spots (id, number) and belt letter. The RouteModal needs this data for the belt spot dropdown.

If the existing endpoint already includes spots, no change needed. If it only returns spot counts, add a `include: { spots: { select: { id: true, number: true } } }` to the query.

**Step 2: Commit if changes were needed**

```bash
git add server/src/routes/belts.ts
git commit -m "feat: include spots in belts list endpoint for route assignment"
```

---

### Task 9: Final verification

**Step 1: Start the server and verify all API endpoints work**

Run: `cd server && npm run dev`

Test with curl or the app:
- `GET /api/routes` — should return empty array
- `GET /api/briefing?date=2026-02-13` — should return default empty briefing
- All existing endpoints should still work

**Step 2: Start the client and verify navigation**

Run: `cd client && npm run dev`

Verify:
- `/` shows the Daily Briefing homepage
- `/facility` shows the facility view (previously at `/`)
- `/routes` shows the routes management table (manager only)
- `/people` shows the people table WITHOUT the Home Area column
- Header says "FedEx" with a Home icon to the left
- Nav links include Home, Facility, Truck Lineup, Routes, People, Time Off

**Step 3: Commit any final fixes**

```bash
git add -A
git commit -m "fix: final adjustments for routes/homepage/nav redesign"
```
