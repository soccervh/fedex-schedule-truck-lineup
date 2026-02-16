# Send to Home Spot Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a "Send to Home Spot" button to the OutOfServiceTruckModal that assigns the truck to its home spot in one click, handling conflicts when the spot is already occupied.

**Architecture:** Expand the OutOfServiceTruckModal's TruckData interface to include homeSpot info, add a new `onEditTruck` callback prop, add a new modal step for home-spot conflict confirmation, and wire it up from TruckLineupPage.

**Tech Stack:** React, TanStack Query, Tailwind CSS, lucide-react icons

---

### Task 1: Expand OutOfServiceTruckModal to support "Send to Home Spot"

**Files:**
- Modify: `client/app/components/OutOfServiceTruckModal.tsx`

**Step 1: Update the TruckData interface to include homeSpot**

Change the `TruckData` interface (lines 6-11) to:

```typescript
interface TruckData {
  id: number;
  number: string;
  status: 'AVAILABLE' | 'ASSIGNED' | 'OUT_OF_SERVICE';
  note?: string;
  homeSpotId?: number | null;
  homeSpot?: {
    id: number;
    number: number;
    belt: {
      id: number;
      letter: string;
    };
  };
}
```

**Step 2: Add `onEditTruck` to props interface**

Update `OutOfServiceTruckModalProps` (lines 30-35) to:

```typescript
interface OutOfServiceTruckModalProps {
  truck: TruckData;
  allBelts: Belt[];
  date: string;
  onClose: () => void;
  onEditTruck?: () => void;
}
```

And destructure it in the component function signature (line 39-44):

```typescript
export function OutOfServiceTruckModal({
  truck,
  allBelts,
  date,
  onClose,
  onEditTruck,
}: OutOfServiceTruckModalProps) {
```

**Step 3: Add `confirm-home-spot` to ModalStep type**

Change line 37 to:

```typescript
type ModalStep = 'select' | 'confirm-available' | 'confirm-spot' | 'confirm-home-spot';
```

**Step 4: Add home spot lookup logic**

After the `allSpots` sorting block (after line 104), add:

```typescript
// Look up home spot occupancy
const homeSpotLabel = truck.homeSpot
  ? `${truck.homeSpot.belt.letter}${truck.homeSpot.number}`
  : null;

const homeSpotOccupant = truck.homeSpot
  ? allSpots.find(s => s.id === truck.homeSpot!.id)
  : null;
```

**Step 5: Add handler for "Send to Home Spot"**

After `handleMoveToAvailable` (after line 108), add:

```typescript
const handleSendToHomeSpot = () => {
  if (!truck.homeSpot) return;
  if (homeSpotOccupant?.hasTruck) {
    setStep('confirm-home-spot');
  } else {
    // Home spot is empty — go straight to "is it ready?" confirmation
    setSelectedSpot({
      id: truck.homeSpot.id,
      beltLetter: truck.homeSpot.belt.letter,
      spotNumber: truck.homeSpot.number,
    });
    setStep('confirm-spot');
  }
};

const handleConfirmHomeSpot = () => {
  if (!truck.homeSpot) return;
  assignToSpotMutation.mutate({ spotId: truck.homeSpot.id });
};
```

**Step 6: Add the "Send to Home Spot" / "Add Home Spot" button in the `select` step**

In the `select` step's content area (after line 155 `<div className="flex-1 overflow-y-auto p-4 space-y-4">`), add BEFORE the "Move to Available" button:

```tsx
{/* Send to Home Spot */}
{truck.homeSpot ? (
  <button
    onClick={handleSendToHomeSpot}
    className="w-full p-4 bg-blue-50 border border-blue-200 rounded-lg text-left hover:bg-blue-100 transition-colors"
  >
    <div className="flex items-center gap-3">
      <Home size={24} className="text-blue-600" />
      <div>
        <p className="font-semibold text-blue-800">
          Send to Home Spot ({homeSpotLabel})
        </p>
        <p className="text-sm text-gray-600">
          Assign truck to its designated spot
          {homeSpotOccupant?.hasTruck && (
            <span className="text-amber-600 ml-1">
              (currently has {homeSpotOccupant.currentTruck})
            </span>
          )}
        </p>
      </div>
    </div>
  </button>
) : onEditTruck ? (
  <button
    onClick={() => { onClose(); onEditTruck(); }}
    className="w-full p-4 bg-gray-50 border border-gray-200 rounded-lg text-left hover:bg-gray-100 transition-colors"
  >
    <div className="flex items-center gap-3">
      <Home size={24} className="text-gray-400" />
      <div>
        <p className="font-semibold text-gray-700">Add Home Spot</p>
        <p className="text-sm text-gray-500">No home spot set — tap to assign one</p>
      </div>
    </div>
  </button>
) : null}
```

**Step 7: Add the `Home` icon import**

Update the lucide-react import (line 4) to:

```typescript
import { X, AlertTriangle, CheckCircle, Truck, Home } from 'lucide-react';
```

**Step 8: Add the `confirm-home-spot` step UI**

After the `confirm-spot` step section (after line 284), add:

```tsx
{step === 'confirm-home-spot' && truck.homeSpot && (
  <div className="p-6 space-y-4">
    <div className="flex items-center justify-center gap-2 text-amber-600">
      <AlertTriangle size={24} />
      <span className="font-semibold">Spot Already Occupied</span>
    </div>

    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
      <p className="text-lg font-semibold text-gray-800">
        Is truck {truck.number} ready to drive?
      </p>
      {truck.note && (
        <p className="text-sm text-red-600 mt-2">
          Previous issue: {truck.note}
        </p>
      )}
      <p className="text-gray-600 mt-3">
        {homeSpotLabel} already has truck <strong>{homeSpotOccupant?.currentTruck}</strong>.
      </p>
      <p className="text-gray-600 mt-1">
        It will be moved to <strong>Available (Spare)</strong>.
      </p>
    </div>

    <div className="flex gap-3">
      <button
        onClick={handleBack}
        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
      >
        No, Go Back
      </button>
      <button
        onClick={handleConfirmHomeSpot}
        disabled={isPending}
        className="flex-1 bg-green-600 text-white py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
      >
        {isPending ? 'Assigning...' : 'Yes, Swap Trucks'}
      </button>
    </div>
  </div>
)}
```

**Step 9: Commit**

```bash
git add client/app/components/OutOfServiceTruckModal.tsx
git commit -m "feat: add Send to Home Spot button to OutOfServiceTruckModal"
```

---

### Task 2: Wire up TruckLineupPage to pass homeSpot data and onEditTruck callback

**Files:**
- Modify: `client/app/pages/TruckLineupPage.tsx`

**Step 1: Add onEditTruck handler**

The `outOfServiceTruck` state already holds a full `Truck` object (which includes `homeSpot` from the API). We just need to add an `onEditTruck` callback.

After `handleOutOfServiceTruckClick` (line 88-89), add:

```typescript
const handleEditOutOfServiceTruck = () => {
  if (outOfServiceTruck) {
    setSelectedTruck(outOfServiceTruck);
    setTruckModalOpen(true);
    setOutOfServiceTruck(null);
  }
};
```

**Step 2: Pass `onEditTruck` to OutOfServiceTruckModal**

Update the OutOfServiceTruckModal usage (lines 315-322) to:

```tsx
{outOfServiceTruck && beltsData && (
  <OutOfServiceTruckModal
    truck={outOfServiceTruck}
    allBelts={beltsData}
    date={selectedDate}
    onClose={() => setOutOfServiceTruck(null)}
    onEditTruck={handleEditOutOfServiceTruck}
  />
)}
```

**Step 3: Commit**

```bash
git add client/app/pages/TruckLineupPage.tsx
git commit -m "feat: wire up Send to Home Spot in TruckLineupPage"
```
