# Truck Types Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a truck type dropdown (Reach, 900, Sprinter Van, Rental, Unknown) to truck creation/editing, and display the type on truck cards.

**Architecture:** Add a Prisma enum `TruckType`, add `truckType` field to the Truck model defaulting to `UNKNOWN`, wire it through the API and UI.

**Tech Stack:** Prisma, PostgreSQL, Express, React, TanStack Query, Tailwind CSS

---

### Task 1: Add TruckType enum and field to Prisma schema

**Files:**
- Modify: `server/prisma/schema.prisma:37-41` (add enum after TruckStatus)
- Modify: `server/prisma/schema.prisma:168-178` (add field to Truck model)

**Step 1: Add the TruckType enum after TruckStatus**

After line 41 (closing `}` of `TruckStatus`), add:

```prisma
enum TruckType {
  REACH
  NINE_HUNDRED
  SPRINTER_VAN
  RENTAL
  UNKNOWN
}
```

**Step 2: Add truckType field to Truck model**

In the Truck model, after the `status` line (line 171), add:

```prisma
  truckType       TruckType             @default(UNKNOWN)
```

**Step 3: Generate and run migration**

Run: `cd /Users/soccervh/development/fedex-schedule-truck-lineup/server && npx prisma migrate dev --name add_truck_type`

Expected: Migration creates the enum and adds the column with default `UNKNOWN` for all existing rows.

**Step 4: Commit**

```bash
git add server/prisma/schema.prisma server/prisma/migrations/
git commit -m "feat: add TruckType enum and truckType field to Truck model"
```

---

### Task 2: Update API routes to accept truckType

**Files:**
- Modify: `server/src/routes/trucks.ts:51` (create route destructuring)
- Modify: `server/src/routes/trucks.ts:84` (update route destructuring)

**Step 1: Update create route (POST /trucks)**

In `server/src/routes/trucks.ts`, line 51, change the destructuring from:
```typescript
const { number, status, note, homeSpotId } = req.body;
```
to:
```typescript
const { number, status, note, homeSpotId, truckType } = req.body;
```

And in the `prisma.truck.create` data object (line 58-63), add `truckType`:
```typescript
data: {
  number,
  status: status || 'AVAILABLE',
  truckType: truckType || 'UNKNOWN',
  note,
  homeSpotId: homeSpotId ? parseInt(homeSpotId, 10) : null,
},
```

**Step 2: Update update route (PATCH /trucks/:id)**

In `server/src/routes/trucks.ts`, line 84, change the destructuring from:
```typescript
const { status, note, homeSpotId } = req.body;
```
to:
```typescript
const { status, note, homeSpotId, truckType } = req.body;
```

And in the `prisma.truck.update` data object (line 88-91), add `truckType`:
```typescript
data: {
  ...(status && { status }),
  ...(truckType && { truckType }),
  ...(note !== undefined && { note }),
  ...(homeSpotId !== undefined && { homeSpotId: homeSpotId ? parseInt(homeSpotId, 10) : null }),
},
```

**Step 3: Commit**

```bash
git add server/src/routes/trucks.ts
git commit -m "feat: accept truckType in truck create/update API"
```

---

### Task 3: Update client Truck types

**Files:**
- Modify: `client/app/types/lineup.ts:3-8` (TruckData interface)
- Modify: `client/app/types/lineup.ts:65-79` (Truck interface)

**Step 1: Add TruckType type and update interfaces**

At the top of `client/app/types/lineup.ts`, add the type:
```typescript
export type TruckType = 'REACH' | 'NINE_HUNDRED' | 'SPRINTER_VAN' | 'RENTAL' | 'UNKNOWN';
```

Add `truckType` to `TruckData` interface:
```typescript
export interface TruckData {
  id: number;
  number: string;
  status: 'AVAILABLE' | 'ASSIGNED' | 'OUT_OF_SERVICE';
  truckType: TruckType;
  note?: string;
}
```

Add `truckType` to the `Truck` interface:
```typescript
export interface Truck {
  id: number;
  number: string;
  status: 'AVAILABLE' | 'ASSIGNED' | 'OUT_OF_SERVICE';
  truckType: TruckType;
  ...
}
```

**Step 2: Add a display label map (in the same file or a utility)**

Add at the bottom of `client/app/types/lineup.ts`:
```typescript
export const TRUCK_TYPE_LABELS: Record<TruckType, string> = {
  REACH: 'Reach',
  NINE_HUNDRED: '900',
  SPRINTER_VAN: 'Sprinter Van',
  RENTAL: 'Rental',
  UNKNOWN: 'Unknown',
};
```

**Step 3: Commit**

```bash
git add client/app/types/lineup.ts
git commit -m "feat: add TruckType to client type definitions"
```

---

### Task 4: Add truck type dropdown to TruckModal

**Files:**
- Modify: `client/app/components/TruckModal.tsx`

**Step 1: Import TRUCK_TYPE_LABELS and TruckType**

Add import at top of file:
```typescript
import { TRUCK_TYPE_LABELS, TruckType } from '../types/lineup';
```

**Step 2: Add truckType to the local Truck interface**

Add `truckType?: TruckType;` to the local Truck interface (line 6-20).

**Step 3: Add truckType to formData state**

In the `useState` call (line 37-42), add:
```typescript
truckType: truck?.truckType || 'UNKNOWN',
```

**Step 4: Add the dropdown in the form**

After the Status dropdown (after line 143), add:
```tsx
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">
    Truck Type
  </label>
  <select
    value={formData.truckType}
    onChange={(e) => setFormData({ ...formData, truckType: e.target.value as TruckType })}
    className="w-full px-3 py-2 border rounded-md"
  >
    {Object.entries(TRUCK_TYPE_LABELS).map(([value, label]) => (
      <option key={value} value={value}>
        {label}
      </option>
    ))}
  </select>
</div>
```

**Step 5: Commit**

```bash
git add client/app/components/TruckModal.tsx
git commit -m "feat: add truck type dropdown to TruckModal"
```

---

### Task 5: Display truck type on lineup cards and sidebars

**Files:**
- Modify: `client/app/components/TruckLineupView.tsx` (TruckData interface + sidebar rendering)
- Modify: `client/app/components/BeltColumn.tsx` (TruckData interface)
- Modify: `client/app/components/SpotCardCompact.tsx` (TruckAssignment interface + display)

**Step 1: Update TruckData in TruckLineupView.tsx**

Add `truckType` to the local TruckData interface (lines 6-11):
```typescript
interface TruckData {
  id: number;
  number: string;
  status: 'AVAILABLE' | 'ASSIGNED' | 'OUT_OF_SERVICE';
  truckType?: string;
  note?: string;
}
```

Import the label map or add a local helper:
```typescript
const truckTypeLabel = (t?: string) => {
  const labels: Record<string, string> = { REACH: 'Reach', NINE_HUNDRED: '900', SPRINTER_VAN: 'Sprinter Van', RENTAL: 'Rental', UNKNOWN: 'Unknown' };
  return t ? labels[t] || t : '';
};
```

**Step 2: Show truck type in TruckSidebar cards**

In the TruckSidebar truck card (around line 137), after `<div className="font-semibold">{truck.number}</div>`, add:
```tsx
{truck.truckType && truck.truckType !== 'UNKNOWN' && (
  <div className="text-xs opacity-75">{truckTypeLabel(truck.truckType)}</div>
)}
```

**Step 3: Show truck type in MobileTruckPanel cards**

In the MobileTruckPanel truck card (around line 196), after `<div className="font-semibold">{truck.number}</div>`, add the same:
```tsx
{truck.truckType && truck.truckType !== 'UNKNOWN' && (
  <div className="text-xs opacity-75">{truckTypeLabel(truck.truckType)}</div>
)}
```

**Step 4: Update BeltColumn TruckData interface**

In `client/app/components/BeltColumn.tsx`, add `truckType?: string;` to the local TruckData interface (lines 5-9).

**Step 5: Update SpotCardCompact to show truck type**

In `client/app/components/SpotCardCompact.tsx`, add `truckType?: string;` to the truck object in the TruckAssignment interface (lines 22-27).

Where truck info is displayed on the spot card (line 144), update to also show type:
```tsx
{truckNumber && (
  <div className="text-xs opacity-80">
    T: {truckNumber}
    {truckAssignment?.truck.truckType && truckAssignment.truck.truckType !== 'UNKNOWN' && (
      <span className="ml-1">({truckTypeLabel(truckAssignment.truck.truckType)})</span>
    )}
  </div>
)}
```

Add the same `truckTypeLabel` helper at the top of the file or import from types.

**Step 6: Commit**

```bash
git add client/app/components/TruckLineupView.tsx client/app/components/BeltColumn.tsx client/app/components/SpotCardCompact.tsx
git commit -m "feat: display truck type on lineup cards and sidebars"
```

---

### Task 6: Verify everything works

**Step 1: Start the dev server and test**

Run: `cd /Users/soccervh/development/fedex-schedule-truck-lineup && npm run dev` (or however the app starts)

**Step 2: Manual verification checklist**

- Create a new truck — truck type defaults to Unknown
- Edit a truck — change truck type to Reach, save, verify it persists
- Check available sidebar — truck type label shows under truck number
- Check out-of-service sidebar — truck type label shows
- Check belt spot cards — truck type shows next to truck number
- Existing trucks all show as Unknown (no label displayed since Unknown is hidden)
