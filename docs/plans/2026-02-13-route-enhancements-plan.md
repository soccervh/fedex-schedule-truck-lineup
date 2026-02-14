# Route Enhancements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add LoadLocation to routes, seed 256 routes mapped to belt spots, update Routes page and facility spot modal with route/load-location editing.

**Architecture:** Add a `LoadLocation` enum and field to the Prisma `Route` model. Seed routes 101-164, 201-264, 301-364, 401-464 with each pair of routes mapped to a belt spot (2 routes per spot). Update the server API to handle `loadLocation`. Update the Routes page table and modal to display/edit load location. Update the facility AssignmentModal to show routes from the Routes table and allow editing load location.

**Tech Stack:** Prisma + PostgreSQL, Express.js API, React 19 + React Router v7, TanStack Query, Tailwind CSS

---

### Task 1: Add LoadLocation Enum and Field to Schema

**Files:**
- Modify: `server/prisma/schema.prisma:195-204` (Route model area)

**Step 1: Add the LoadLocation enum and update Route model**

Add this enum before the `Route` model in `schema.prisma`:

```prisma
enum LoadLocation {
  DOC
  UNLOAD
  LABEL_FACER
  SCANNER
  SPLITTER
  FO
  PULLER
}
```

Add field to the `Route` model:

```prisma
model Route {
  id           Int            @id @default(autoincrement())
  number       String         @unique
  assignedArea RouteArea
  beltSpotId   Int?
  beltSpot     Spot?          @relation(fields: [beltSpotId], references: [id])
  loadLocation LoadLocation?
  isActive     Boolean        @default(true)
  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt
}
```

**Step 2: Push schema changes**

Run: `cd server && npx prisma db push`
Expected: Schema pushed successfully, Route table updated with `loadLocation` column.

**Step 3: Regenerate Prisma client**

Run: `cd server && npx prisma generate`
Expected: Prisma client regenerated with LoadLocation enum.

**Step 4: Commit**

```bash
git add server/prisma/schema.prisma
git commit -m "feat: add LoadLocation enum and field to Route model"
```

---

### Task 2: Seed 256 Routes Mapped to Belt Spots

**Files:**
- Modify: `server/prisma/seed.ts` (add route seeding after belt/spot creation)

**Context:**
- 4 belts with 32 spots each. Belt A has baseNumber=100, B=200, C=300, D=400.
- 64 routes per belt: 101-164, 201-264, 301-364, 401-464.
- 2 routes per spot: spot N gets routes (baseNumber + N*2 - 1) and (baseNumber + N*2).
  - Spot 1: routes 101, 102. Spot 2: routes 103, 104. ... Spot 32: routes 163, 164.
- All routes have `assignedArea: 'BELT_SPOT'` with `beltSpotId` linking to their spot.

**Step 1: Add route seeding logic**

After the belt creation section in `seed.ts` (after `console.log('Seeded 4 belts with 32 spots each')`), add:

```typescript
// Seed routes: 2 per spot (odd + even), 64 per belt, 256 total
const allSpotsForRoutes = await prisma.spot.findMany({
  include: { belt: true },
  orderBy: [{ beltId: 'asc' }, { number: 'asc' }],
});

let routeCount = 0;
for (const spot of allSpotsForRoutes) {
  const base = spot.belt.baseNumber;
  const oddRoute = base + spot.number * 2 - 1;  // e.g., 101, 103, 105...
  const evenRoute = base + spot.number * 2;      // e.g., 102, 104, 106...

  await prisma.route.createMany({
    data: [
      { number: String(oddRoute), assignedArea: 'BELT_SPOT', beltSpotId: spot.id },
      { number: String(evenRoute), assignedArea: 'BELT_SPOT', beltSpotId: spot.id },
    ],
  });
  routeCount += 2;
}
console.log(`Seeded ${routeCount} routes (2 per spot, 64 per belt)`);
```

**Step 2: Test seed locally (optional)**

Run: `cd server && npx prisma db push --force-reset && npx tsx prisma/seed.ts`
Expected: Output includes "Seeded 256 routes (2 per spot, 64 per belt)"

**Step 3: Commit**

```bash
git add server/prisma/seed.ts
git commit -m "feat: seed 256 routes mapped to belt spots"
```

---

### Task 3: Update Routes API to Handle LoadLocation

**Files:**
- Modify: `server/src/routes/routes.ts`

**Step 1: Add loadLocation to create and update endpoints**

In the POST handler (create route), add `loadLocation` to the destructured body and the `data` object:

```typescript
const { number, assignedArea, beltSpotId, loadLocation } = req.body;
// ...
const route = await prisma.route.create({
  data: {
    number,
    assignedArea,
    beltSpotId: assignedArea === 'BELT_SPOT' ? beltSpotId : null,
    loadLocation: loadLocation || null,
  },
  // ... same include
});
```

In the PUT handler (update route), same change:

```typescript
const { number, assignedArea, beltSpotId, loadLocation } = req.body;
// ...
const route = await prisma.route.update({
  where: { id },
  data: {
    number,
    assignedArea,
    beltSpotId: assignedArea === 'BELT_SPOT' ? beltSpotId : null,
    loadLocation: loadLocation || null,
  },
  // ... same include
});
```

**Step 2: Add endpoint to get routes by spot ID**

Add a new GET endpoint to look up routes for a specific belt spot (used by AssignmentModal):

```typescript
// Get routes for a specific belt spot
router.get('/by-spot/:spotId', authenticate, async (req, res) => {
  try {
    const spotId = parseInt(req.params.spotId as string);
    const routes = await prisma.route.findMany({
      where: { beltSpotId: spotId, isActive: true },
      orderBy: { number: 'asc' },
    });
    res.json(routes);
  } catch (error) {
    console.error('Get routes by spot error:', error);
    res.status(500).json({ error: 'Failed to get routes for spot' });
  }
});
```

**Step 3: Add PATCH endpoint for updating just loadLocation**

This allows the AssignmentModal to update a route's load location without changing other fields:

```typescript
// Update route load location (manager only)
router.patch('/:id/load-location', authenticate, requireManager, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const { loadLocation } = req.body;

    const route = await prisma.route.update({
      where: { id },
      data: { loadLocation: loadLocation || null },
    });

    res.json(route);
  } catch (error) {
    console.error('Update load location error:', error);
    res.status(500).json({ error: 'Failed to update load location' });
  }
});
```

**Step 4: Commit**

```bash
git add server/src/routes/routes.ts
git commit -m "feat: add loadLocation to routes API and spot lookup endpoint"
```

---

### Task 4: Update Routes Page with Load Location Column

**Files:**
- Modify: `client/app/pages/Routes.tsx`

**Step 1: Add loadLocation labels map**

Add after the `areaLabels` constant:

```typescript
const loadLocationLabels: Record<string, string> = {
  DOC: 'Doc',
  UNLOAD: 'Unload',
  LABEL_FACER: 'Label Facer',
  SCANNER: 'Scanner',
  SPLITTER: 'Splitter',
  FO: 'FO',
  PULLER: 'Puller',
};
```

**Step 2: Add Load Location column to table**

Add a new `<th>` after the "Assigned Area" header:

```tsx
<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
  Load Location
</th>
```

Add a new `<td>` after the area cell in each row:

```tsx
<td className="px-6 py-4 whitespace-nowrap text-gray-500">
  {route.loadLocation ? loadLocationLabels[route.loadLocation] || route.loadLocation : '—'}
</td>
```

**Step 3: Commit**

```bash
git add client/app/pages/Routes.tsx
git commit -m "feat: add Load Location column to Routes table"
```

---

### Task 5: Update RouteModal with Load Location Dropdown

**Files:**
- Modify: `client/app/components/RouteModal.tsx`

**Step 1: Add loadLocation to form state and interface**

Update the `RouteData` interface:

```typescript
interface RouteData {
  id?: number;
  number: string;
  assignedArea: 'EO_POOL' | 'UNLOAD' | 'DOCK' | 'BELT_SPOT';
  beltSpotId?: number | null;
  loadLocation?: string | null;
}
```

Update the `formData` state:

```typescript
const [formData, setFormData] = useState({
  number: route?.number || '',
  assignedArea: route?.assignedArea || 'EO_POOL' as const,
  beltSpotId: route?.beltSpotId || null as number | null,
  loadLocation: route?.loadLocation || '' as string,
});
```

**Step 2: Add Load Location dropdown to the form**

Add after the belt spot select (before the submit button):

```tsx
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">
    Load Location
  </label>
  <select
    value={formData.loadLocation}
    onChange={(e) => setFormData({ ...formData, loadLocation: e.target.value })}
    className="w-full px-3 py-2 border rounded-md"
  >
    <option value="">None</option>
    <option value="DOC">Doc</option>
    <option value="UNLOAD">Unload</option>
    <option value="LABEL_FACER">Label Facer</option>
    <option value="SCANNER">Scanner</option>
    <option value="SPLITTER">Splitter</option>
    <option value="FO">FO</option>
    <option value="PULLER">Puller</option>
  </select>
</div>
```

**Step 3: Commit**

```bash
git add client/app/components/RouteModal.tsx
git commit -m "feat: add Load Location dropdown to RouteModal"
```

---

### Task 6: Update AssignmentModal with Route Info and Load Location

**Files:**
- Modify: `client/app/components/AssignmentModal.tsx`

**Context:**
- The AssignmentModal currently has a "Route Override" section that calculates routes from `baseNumber + spotNumber*2` with a manual override input.
- Replace this with route info pulled from the Routes table via the new `/api/routes/by-spot/:spotId` endpoint.
- Display route numbers for this spot and allow editing load location per route.
- Keep existing driver/truck assignment functionality unchanged.

**Step 1: Add route query and load location mutation**

Add a query for routes assigned to this spot:

```typescript
const { data: spotRoutes } = useQuery({
  queryKey: ['spot-routes', spot.id],
  queryFn: async () => {
    const res = await api.get(`/routes/by-spot/${spot.id}`);
    return res.data;
  },
});
```

Add a mutation for updating load location:

```typescript
const loadLocationMutation = useMutation({
  mutationFn: async ({ routeId, loadLocation }: { routeId: number; loadLocation: string | null }) => {
    return api.patch(`/routes/${routeId}/load-location`, { loadLocation });
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['spot-routes', spot.id] });
    queryClient.invalidateQueries({ queryKey: ['routes'] });
  },
});
```

**Step 2: Replace the Route Override section**

Replace the entire `{/* Route Override Section */}` block (lines 145-187) with a new Routes section that shows route numbers from the Routes table and load location dropdowns:

```tsx
{/* Routes Section */}
{spotRoutes && spotRoutes.length > 0 && (
  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2">
    <span className="text-sm font-medium text-gray-700">Routes</span>
    {spotRoutes.map((route: any) => (
      <div key={route.id} className="flex items-center gap-2">
        <span className="text-sm font-semibold w-12">R:{route.number}</span>
        <select
          value={route.loadLocation || ''}
          onChange={(e) => loadLocationMutation.mutate({
            routeId: route.id,
            loadLocation: e.target.value || null,
          })}
          className="flex-1 px-2 py-1 border rounded text-sm"
          disabled={loadLocationMutation.isPending}
        >
          <option value="">No Load Location</option>
          <option value="DOC">Doc</option>
          <option value="UNLOAD">Unload</option>
          <option value="LABEL_FACER">Label Facer</option>
          <option value="SCANNER">Scanner</option>
          <option value="SPLITTER">Splitter</option>
          <option value="FO">FO</option>
          <option value="PULLER">Puller</option>
        </select>
      </div>
    ))}
  </div>
)}
```

**Step 3: Remove old route override state and mutations**

Remove:
- `defaultRoute`, `effectiveRoute` calculations (lines 39-40)
- `routeOverrideInput` state (lines 41-43)
- `routeOverrideMutation` (lines 85-93)
- `handleSaveRouteOverride` function (lines 112-118)
- `handleResetRouteOverride` function (lines 120-123)
- Import of `calculateRouteNumber`, `getEffectiveRouteNumber` from belt utils (line 6)

**Step 4: Commit**

```bash
git add client/app/components/AssignmentModal.tsx
git commit -m "feat: show route info and load location in AssignmentModal"
```

---

### Task 7: Update SpotCardCompact to Display Route from Routes Table

**Files:**
- Modify: `client/app/components/SpotCardCompact.tsx`

**Context:**
- Currently, SpotCardCompact calculates route numbers using `getEffectiveRouteNumber(baseNumber, spotNumber, routeOverride)`.
- We want it to display route numbers from the Routes table instead. However, fetching per-card is expensive.
- Best approach: the belt assignments API already returns spot data. We can extend the API to include routes for each spot, or we can keep the existing calculated display (which matches the seeded data since route = baseNumber + spot*2). The calculated formula still works because the seeded routes follow the same pattern.
- Decision: Keep the current calculated route display on the spot card (it matches the seed data). The full route details with load location are shown in the AssignmentModal when you click a spot. This avoids an API change for the card display.

**Step 1: No changes needed**

The spot card already displays `R:{routeNumber}` using the calculated formula, which matches the seeded data. The AssignmentModal (Task 6) handles the detailed route view with load location editing.

**Step 2: Commit**

No commit needed - this task is a no-op by design.

---

### Task 8: Verify End-to-End

**Step 1: Start the server**

Run: `cd server && npm run dev`

**Step 2: Start the client**

Run: `cd client && npm run dev`

**Step 3: Verify**

1. Check Routes page shows all 256 seeded routes with Load Location column (initially all "—")
2. Edit a route via RouteModal — confirm Load Location dropdown works
3. Go to Facility page, click a belt spot — confirm AssignmentModal shows route numbers and load location dropdowns
4. Change a load location in the modal, confirm it saves

**Step 4: Final commit if any fixes needed**
