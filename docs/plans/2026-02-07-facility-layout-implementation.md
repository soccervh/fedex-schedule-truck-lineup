# Facility Layout Redesign - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign the UI to show all 4 belts in a facility layout view, with zoom-to-detail functionality.

**Architecture:** Update Belt model with letter/baseNumber fields, create FacilityView showing all belts, add NeedsFillSidebar, implement double-click zoom to detailed belt view.

**Tech Stack:** React, TypeScript, Tailwind CSS, Prisma, PostgreSQL

---

## Task 1: Update Belt Model

**Files:**
- Modify: `server/prisma/schema.prisma`
- Modify: `server/prisma/seed.ts`

**Step 1: Update schema to add letter and baseNumber fields**

Edit `server/prisma/schema.prisma`, update the Belt model:

```prisma
model Belt {
  id         Int      @id
  name       String
  letter     String   // A, B, C, D
  baseNumber Int      // 100, 200, 300, 400
  spots      Spot[]
}
```

**Step 2: Update seed script with new belt data**

Edit `server/prisma/seed.ts`, update belt creation:

```typescript
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
```

**Step 3: Create migration**

Run:
```bash
cd server && npx prisma migrate dev --name add_belt_letter_base
```

**Step 4: Reseed database**

Run:
```bash
cd server && npx prisma migrate reset --force
```

**Step 5: Commit**

```bash
git add -A && git commit -m "feat: add letter and baseNumber to Belt model"
```

---

## Task 2: Update Belt API Response

**Files:**
- Modify: `server/src/routes/belts.ts`

**Step 1: Update belt endpoints to include new fields**

The Prisma query already returns all fields, but verify the response includes `letter` and `baseNumber`. No code changes needed if using `findMany` without `select`.

**Step 2: Verify by testing the endpoint**

Run server and test:
```bash
curl http://localhost:3001/api/belts -H "Authorization: Bearer <token>"
```

Should return belts with `letter` and `baseNumber` fields.

**Step 3: Commit if any changes**

```bash
git add -A && git commit -m "feat: include belt letter and baseNumber in API"
```

---

## Task 3: Create Utility Functions

**Files:**
- Create: `client/src/utils/belt.ts`

**Step 1: Create belt utility functions**

Create `client/src/utils/belt.ts`:

```typescript
export interface BeltInfo {
  id: number;
  name: string;
  letter: string;
  baseNumber: number;
}

/**
 * Calculate route number from belt base and spot number
 * Route = baseNumber + (spotNumber * 2)
 */
export function calculateRouteNumber(baseNumber: number, spotNumber: number): number {
  return baseNumber + (spotNumber * 2);
}

/**
 * Format spot display name (e.g., "A1", "B15", "D32")
 */
export function formatSpotName(letter: string, spotNumber: number): string {
  return `${letter}${spotNumber}`;
}

/**
 * Format route display (e.g., "R:102", "R:304")
 */
export function formatRouteDisplay(routeNumber: number): string {
  return `R:${routeNumber}`;
}

/**
 * Get belt display order (D, C, B, A = 400, 300, 200, 100)
 */
export function getBeltDisplayOrder(belts: BeltInfo[]): BeltInfo[] {
  return [...belts].sort((a, b) => b.baseNumber - a.baseNumber);
}
```

**Step 2: Commit**

```bash
git add -A && git commit -m "feat: add belt utility functions"
```

---

## Task 4: Create NeedsFillSidebar Component

**Files:**
- Create: `client/src/components/NeedsFillSidebar.tsx`

**Step 1: Create the sidebar component**

Create `client/src/components/NeedsFillSidebar.tsx`:

```tsx
import { calculateRouteNumber, formatSpotName, formatRouteDisplay } from '../utils/belt';

interface CoverageNeed {
  spot: {
    id: number;
    number: number;
    belt: {
      letter: string;
      baseNumber: number;
    };
  };
  user: {
    name: string;
  };
  assignment: {
    id: string;
  };
}

interface NeedsFillSidebarProps {
  coverageNeeds: CoverageNeed[];
  onSpotClick: (spotId: number, beltId: number) => void;
}

export function NeedsFillSidebar({ coverageNeeds, onSpotClick }: NeedsFillSidebarProps) {
  return (
    <div className="w-48 bg-white border-l border-gray-200 flex flex-col">
      <div className="p-3 border-b border-gray-200 bg-red-50">
        <h3 className="font-semibold text-red-800">NEEDS FILL</h3>
      </div>

      <div className="flex-1 overflow-y-auto">
        {coverageNeeds.length === 0 ? (
          <div className="p-3 text-sm text-gray-500">All spots filled</div>
        ) : (
          coverageNeeds.map((need) => {
            const spotName = formatSpotName(need.spot.belt.letter, need.spot.number);
            const routeNum = calculateRouteNumber(need.spot.belt.baseNumber, need.spot.number);

            return (
              <button
                key={need.spot.id}
                onClick={() => onSpotClick(need.spot.id, need.spot.belt.baseNumber / 100)}
                className="w-full p-3 text-left border-b border-gray-100 hover:bg-red-50 transition-colors"
              >
                <div className="font-medium text-gray-900">
                  {spotName} {formatRouteDisplay(routeNum)}
                </div>
                <div className="text-sm text-gray-600 truncate">
                  ({need.user.name} off)
                </div>
              </button>
            );
          })
        )}
      </div>

      <div className="p-3 border-t border-gray-200 bg-gray-50">
        <span className="text-sm font-medium text-gray-700">
          {coverageNeeds.length} spot{coverageNeeds.length !== 1 ? 's' : ''} open
        </span>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add -A && git commit -m "feat: add NeedsFillSidebar component"
```

---

## Task 5: Create SpotCardCompact Component

**Files:**
- Create: `client/src/components/SpotCardCompact.tsx`

**Step 1: Create compact spot card for facility overview**

Create `client/src/components/SpotCardCompact.tsx`:

```tsx
import { calculateRouteNumber, formatSpotName, formatRouteDisplay } from '../utils/belt';

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

interface SpotCardCompactProps {
  spotNumber: number;
  beltLetter: string;
  baseNumber: number;
  assignment: SpotAssignment | null;
  onClick: () => void;
  onDoubleClick: () => void;
  isManager: boolean;
}

const areaColors = {
  BELT: 'bg-belt',
  DOCK: 'bg-dock',
  UNLOAD: 'bg-unload',
};

export function SpotCardCompact({
  spotNumber,
  beltLetter,
  baseNumber,
  assignment,
  onClick,
  onDoubleClick,
  isManager,
}: SpotCardCompactProps) {
  const routeNumber = calculateRouteNumber(baseNumber, spotNumber);
  const spotName = formatSpotName(beltLetter, spotNumber);

  const getBackgroundClass = () => {
    if (!assignment) return 'bg-gray-50 border-dashed';
    if (assignment.needsCoverage) return 'bg-red-100 border-red-400 border-2';
    if (assignment.user.role === 'SWING') return 'bg-swing text-white';
    return `${areaColors[assignment.user.homeArea]} text-white`;
  };

  return (
    <button
      onClick={onClick}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onDoubleClick();
      }}
      disabled={!isManager && !assignment?.needsCoverage}
      className={`w-full p-2 rounded border transition-all hover:shadow-md text-left ${getBackgroundClass()} ${
        isManager ? 'cursor-pointer' : 'cursor-default'
      }`}
    >
      <div className="flex justify-between items-center text-xs font-medium opacity-90">
        <span>{spotName}</span>
        <span>{formatRouteDisplay(routeNumber)}</span>
      </div>
      {assignment ? (
        <>
          <div className={`font-semibold truncate text-sm ${assignment.needsCoverage ? 'line-through opacity-60' : ''}`}>
            {assignment.user.name}
          </div>
          <div className="text-xs opacity-80">T: {assignment.truckNumber}</div>
          {assignment.needsCoverage && (
            <div className="text-xs font-bold text-red-700 mt-1">OPEN</div>
          )}
        </>
      ) : (
        <div className="text-gray-400 text-sm">—</div>
      )}
    </button>
  );
}
```

**Step 2: Commit**

```bash
git add -A && git commit -m "feat: add SpotCardCompact component"
```

---

## Task 6: Create BeltColumn Component

**Files:**
- Create: `client/src/components/BeltColumn.tsx`

**Step 1: Create belt column for facility view**

Create `client/src/components/BeltColumn.tsx`:

```tsx
import { SpotCardCompact } from './SpotCardCompact';

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

interface BeltColumnProps {
  beltId: number;
  beltName: string;
  beltLetter: string;
  baseNumber: number;
  spots: Spot[];
  onSpotClick: (spot: Spot) => void;
  onSpotDoubleClick: (beltId: number) => void;
  isManager: boolean;
}

export function BeltColumn({
  beltId,
  beltName,
  beltLetter,
  baseNumber,
  spots,
  onSpotClick,
  onSpotDoubleClick,
  isManager,
}: BeltColumnProps) {
  // Sort spots by number (1 at top/north, 32 at bottom/south)
  const sortedSpots = [...spots].sort((a, b) => a.number - b.number);

  return (
    <div className="flex flex-col min-w-[140px]">
      <div className="bg-gray-800 text-white text-center py-2 font-semibold rounded-t">
        {beltName}
      </div>
      <div className="flex-1 bg-gray-50 border border-t-0 border-gray-200 rounded-b p-1 space-y-1 overflow-y-auto">
        {sortedSpots.map((spot) => (
          <SpotCardCompact
            key={spot.id}
            spotNumber={spot.number}
            beltLetter={beltLetter}
            baseNumber={baseNumber}
            assignment={spot.assignment}
            onClick={() => onSpotClick(spot)}
            onDoubleClick={() => onSpotDoubleClick(beltId)}
            isManager={isManager}
          />
        ))}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add -A && git commit -m "feat: add BeltColumn component"
```

---

## Task 7: Create SpotCardDetailed Component

**Files:**
- Create: `client/src/components/SpotCardDetailed.tsx`

**Step 1: Create detailed spot card for belt detail view**

Create `client/src/components/SpotCardDetailed.tsx`:

```tsx
import { calculateRouteNumber, formatSpotName, formatRouteDisplay } from '../utils/belt';

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

interface TimeOffInfo {
  type: string;
  note?: string;
}

interface SpotCardDetailedProps {
  spotNumber: number;
  beltLetter: string;
  baseNumber: number;
  assignment: SpotAssignment | null;
  timeOffInfo?: TimeOffInfo;
  onClick: () => void;
  isManager: boolean;
}

const areaColors = {
  BELT: 'bg-belt',
  DOCK: 'bg-dock',
  UNLOAD: 'bg-unload',
};

const areaLabels = {
  BELT: 'Belt',
  DOCK: 'Dock',
  UNLOAD: 'Unload',
};

export function SpotCardDetailed({
  spotNumber,
  beltLetter,
  baseNumber,
  assignment,
  timeOffInfo,
  onClick,
  isManager,
}: SpotCardDetailedProps) {
  const routeNumber = calculateRouteNumber(baseNumber, spotNumber);
  const spotName = formatSpotName(beltLetter, spotNumber);

  const getBackgroundClass = () => {
    if (!assignment) return 'bg-gray-50 border-dashed';
    if (assignment.needsCoverage) return 'bg-red-50 border-red-400 border-2';
    if (assignment.user.role === 'SWING') return 'bg-swing/10 border-swing';
    return 'bg-white border-gray-200';
  };

  const getAccentClass = () => {
    if (!assignment) return 'bg-gray-200';
    if (assignment.needsCoverage) return 'bg-red-500';
    if (assignment.user.role === 'SWING') return 'bg-swing';
    return areaColors[assignment.user.homeArea];
  };

  return (
    <button
      onClick={onClick}
      disabled={!isManager}
      className={`w-full p-4 rounded-lg border transition-all hover:shadow-md text-left flex ${getBackgroundClass()} ${
        isManager ? 'cursor-pointer' : 'cursor-default'
      }`}
    >
      <div className={`w-1 rounded-full mr-3 ${getAccentClass()}`}></div>

      <div className="flex-1">
        <div className="flex justify-between items-start">
          <div className="font-semibold text-gray-900">
            {spotName} {formatRouteDisplay(routeNumber)}
          </div>
          {assignment?.needsCoverage && (
            <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded font-medium">
              OPEN
            </span>
          )}
        </div>

        {assignment ? (
          <>
            <div className={`text-lg ${assignment.needsCoverage ? 'line-through text-gray-400' : 'text-gray-900'}`}>
              {assignment.user.name}
              {assignment.needsCoverage && timeOffInfo && (
                <span className="text-sm text-red-600 ml-2 no-underline">
                  ← OFF ({timeOffInfo.type}{timeOffInfo.note ? `: "${timeOffInfo.note}"` : ''})
                </span>
              )}
            </div>
            <div className="text-sm text-gray-600">T: {assignment.truckNumber}</div>
            <div className="flex gap-3 mt-2 text-xs text-gray-500">
              <span>Home: {areaLabels[assignment.user.homeArea]}</span>
              {assignment.isOverride ? (
                <span className="text-amber-600">✎ Override</span>
              ) : (
                <span>From Template</span>
              )}
              {assignment.needsCoverage && (
                <span className="text-red-600 font-medium">NEEDS COVERAGE</span>
              )}
            </div>
          </>
        ) : (
          <div className="text-gray-400">Unassigned</div>
        )}
      </div>
    </button>
  );
}
```

**Step 2: Commit**

```bash
git add -A && git commit -m "feat: add SpotCardDetailed component"
```

---

## Task 8: Create BeltDetailView Component

**Files:**
- Create: `client/src/components/BeltDetailView.tsx`

**Step 1: Create belt detail view**

Create `client/src/components/BeltDetailView.tsx`:

```tsx
import { SpotCardDetailed } from './SpotCardDetailed';

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

interface BeltDetailViewProps {
  beltName: string;
  beltLetter: string;
  baseNumber: number;
  spots: Spot[];
  onSpotClick: (spot: Spot) => void;
  onBack: () => void;
  isManager: boolean;
}

export function BeltDetailView({
  beltName,
  beltLetter,
  baseNumber,
  spots,
  onSpotClick,
  onBack,
  isManager,
}: BeltDetailViewProps) {
  const sortedSpots = [...spots].sort((a, b) => a.number - b.number);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-4 mb-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <span className="text-xl">←</span>
          <span>Back to Facility</span>
        </button>
        <h2 className="text-xl font-semibold">{beltName}</h2>
      </div>

      <div className="text-center text-sm text-gray-500 mb-2">NORTH</div>

      <div className="flex-1 overflow-y-auto space-y-2 px-2">
        {sortedSpots.map((spot) => (
          <SpotCardDetailed
            key={spot.id}
            spotNumber={spot.number}
            beltLetter={beltLetter}
            baseNumber={baseNumber}
            assignment={spot.assignment}
            onClick={() => onSpotClick(spot)}
            isManager={isManager}
          />
        ))}
      </div>

      <div className="text-center text-sm text-gray-500 mt-2">SOUTH</div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add -A && git commit -m "feat: add BeltDetailView component"
```

---

## Task 9: Create FacilityView Component

**Files:**
- Create: `client/src/components/FacilityView.tsx`

**Step 1: Create facility overview component**

Create `client/src/components/FacilityView.tsx`:

```tsx
import { BeltColumn } from './BeltColumn';
import { getBeltDisplayOrder } from '../utils/belt';

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

interface Belt {
  id: number;
  name: string;
  letter: string;
  baseNumber: number;
  spots: Spot[];
}

interface FacilityViewProps {
  belts: Belt[];
  onSpotClick: (spot: Spot, beltId: number) => void;
  onBeltDoubleClick: (beltId: number) => void;
  isManager: boolean;
}

export function FacilityView({
  belts,
  onSpotClick,
  onBeltDoubleClick,
  isManager,
}: FacilityViewProps) {
  const orderedBelts = getBeltDisplayOrder(belts);

  return (
    <div className="flex flex-col h-full">
      <div className="text-center text-sm text-gray-500 mb-2">NORTH</div>

      <div className="flex-1 flex gap-2 overflow-x-auto overflow-y-auto pb-4">
        {orderedBelts.map((belt) => (
          <BeltColumn
            key={belt.id}
            beltId={belt.id}
            beltName={belt.name}
            beltLetter={belt.letter}
            baseNumber={belt.baseNumber}
            spots={belt.spots}
            onSpotClick={(spot) => onSpotClick(spot, belt.id)}
            onSpotDoubleClick={onBeltDoubleClick}
            isManager={isManager}
          />
        ))}
      </div>

      <div className="text-center text-sm text-gray-500 mt-2">SOUTH</div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add -A && git commit -m "feat: add FacilityView component"
```

---

## Task 10: Update Coverage API for Sidebar

**Files:**
- Modify: `server/src/routes/timeoff.ts`

**Step 1: Update coverage-needs endpoint to include belt info**

Edit `server/src/routes/timeoff.ts`, update the coverage-needs endpoint to include belt data in the response:

Find the `/coverage-needs` endpoint and update the assignment query to include belt:

```typescript
// Get all assignments for this date
const assignments = await prisma.assignment.findMany({
  where: { date: targetDate },
  include: {
    user: true,
    spot: {
      include: {
        belt: {
          select: {
            id: true,
            letter: true,
            baseNumber: true,
          }
        }
      },
    },
  },
});
```

**Step 2: Commit**

```bash
git add -A && git commit -m "feat: include belt info in coverage-needs response"
```

---

## Task 11: Update Lineup Page

**Files:**
- Modify: `client/src/pages/Lineup.tsx`

**Step 1: Rewrite Lineup page with facility view**

Replace `client/src/pages/Lineup.tsx`:

```tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { FacilityView } from '../components/FacilityView';
import { BeltDetailView } from '../components/BeltDetailView';
import { NeedsFillSidebar } from '../components/NeedsFillSidebar';
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

interface Belt {
  id: number;
  name: string;
  letter: string;
  baseNumber: number;
  spots: Spot[];
}

export function Lineup() {
  const { isManager } = useAuth();
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [detailBeltId, setDetailBeltId] = useState<number | null>(null);
  const [selectedSpot, setSelectedSpot] = useState<{ spot: Spot; beltId: number } | null>(null);

  // Fetch all belts with assignments
  const { data: beltsData, isLoading } = useQuery({
    queryKey: ['all-belts', selectedDate],
    queryFn: async () => {
      const beltsRes = await api.get('/belts');
      const belts = beltsRes.data;

      // Fetch assignments for each belt
      const beltsWithAssignments = await Promise.all(
        belts.map(async (belt: any) => {
          const assignmentsRes = await api.get(
            `/belts/${belt.id}/assignments?date=${selectedDate}`
          );
          return {
            ...belt,
            spots: assignmentsRes.data.spots,
          };
        })
      );

      return beltsWithAssignments as Belt[];
    },
  });

  const { data: coverageData } = useQuery({
    queryKey: ['coverage', selectedDate],
    queryFn: async () => {
      const res = await api.get(`/timeoff/coverage-needs?date=${selectedDate}`);
      return res.data;
    },
  });

  const handleSpotClick = (spot: Spot, beltId: number) => {
    if (!isManager) return;
    setSelectedSpot({ spot, beltId });
  };

  const handleBeltDoubleClick = (beltId: number) => {
    setDetailBeltId(beltId);
  };

  const handleBackToFacility = () => {
    setDetailBeltId(null);
  };

  const handleSidebarSpotClick = (spotId: number, beltId: number) => {
    const belt = beltsData?.find((b) => b.id === beltId);
    const spot = belt?.spots.find((s) => s.id === spotId);
    if (spot && belt) {
      setSelectedSpot({ spot, beltId: belt.id });
    }
  };

  const detailBelt = detailBeltId ? beltsData?.find((b) => b.id === detailBeltId) : null;

  return (
    <div className="flex h-[calc(100vh-120px)]">
      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold">
            {detailBelt ? detailBelt.name : 'Facility View'}
          </h1>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border rounded-md"
          />
        </div>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Loading...
          </div>
        ) : beltsData ? (
          <div className="flex-1 overflow-hidden bg-white rounded-lg shadow p-4">
            {detailBelt ? (
              <BeltDetailView
                beltName={detailBelt.name}
                beltLetter={detailBelt.letter}
                baseNumber={detailBelt.baseNumber}
                spots={detailBelt.spots}
                onSpotClick={(spot) => handleSpotClick(spot, detailBelt.id)}
                onBack={handleBackToFacility}
                isManager={isManager}
              />
            ) : (
              <FacilityView
                belts={beltsData}
                onSpotClick={handleSpotClick}
                onBeltDoubleClick={handleBeltDoubleClick}
                isManager={isManager}
              />
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            No data available
          </div>
        )}

        {/* Legend */}
        <div className="flex gap-4 text-sm mt-4">
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
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-400 border-2 border-red-600"></div>
            <span>Needs Fill</span>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <NeedsFillSidebar
        coverageNeeds={coverageData?.needsCoverage || []}
        onSpotClick={handleSidebarSpotClick}
      />

      {/* Modal */}
      {selectedSpot && (
        <AssignmentModal
          spot={selectedSpot.spot}
          beltId={selectedSpot.beltId}
          date={selectedDate}
          onClose={() => setSelectedSpot(null)}
        />
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add -A && git commit -m "feat: update Lineup page with facility view"
```

---

## Task 12: Remove Old Components

**Files:**
- Delete: `client/src/components/BeltSelector.tsx`
- Delete: `client/src/components/SpotGrid.tsx`
- Delete: `client/src/components/SpotCard.tsx`

**Step 1: Remove unused components**

```bash
rm client/src/components/BeltSelector.tsx
rm client/src/components/SpotGrid.tsx
rm client/src/components/SpotCard.tsx
```

**Step 2: Commit**

```bash
git add -A && git commit -m "chore: remove old belt selector and spot components"
```

---

## Task 13: Test and Fix Integration

**Step 1: Build and verify no errors**

```bash
npm run build
```

Fix any TypeScript errors that appear.

**Step 2: Run the application**

```bash
npm run dev
```

**Step 3: Test manually**

1. Open http://localhost:5173
2. Login as admin@fedex.com / admin123
3. Verify facility view shows all 4 belts (D, C, B, A order)
4. Verify spot cards show spot name + route + name + truck number
5. Double-click a spot to zoom to belt detail view
6. Click "Back to Facility" to return
7. Check sidebar shows open spots

**Step 4: Commit any fixes**

```bash
git add -A && git commit -m "fix: resolve integration issues"
```

---

## Summary

| Task | Description |
|------|-------------|
| 1 | Update Belt model with letter and baseNumber |
| 2 | Update Belt API response |
| 3 | Create belt utility functions |
| 4 | Create NeedsFillSidebar component |
| 5 | Create SpotCardCompact component |
| 6 | Create BeltColumn component |
| 7 | Create SpotCardDetailed component |
| 8 | Create BeltDetailView component |
| 9 | Create FacilityView component |
| 10 | Update coverage API for sidebar |
| 11 | Update Lineup page |
| 12 | Remove old components |
| 13 | Test and fix integration |
