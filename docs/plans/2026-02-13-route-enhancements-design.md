# Route Enhancements Design

## Summary

Enhance the Route model with load locations, seed 256 routes mapped to belt spots, and update the facility view to display and edit route info when clicking spots.

## Changes

### 1. Route Model Changes

Add `loadLocation` field to the `Route` model.

**New enum:** `LoadLocation`
- `DOC`
- `UNLOAD`
- `LABEL_FACER`
- `SCANNER`
- `SPLITTER`
- `FO`
- `PULLER`

**Updated Route model:**
- Add `loadLocation LoadLocation?` (optional, nullable)

### 2. Seed Data

Seed 256 routes mapped to belt spots:
- 101-164 → Belt A (id=1), spots 1-64
- 201-264 → Belt B (id=2), spots 1-64
- 301-364 → Belt C (id=3), spots 1-64
- 401-464 → Belt D (id=4), spots 1-64

Each route's `assignedArea` is `BELT_SPOT`, with `beltSpotId` pointing to the corresponding spot.

Note: Belts currently have 32 spots each (1-32). Routes 101-132 map to existing spots. Routes 133-164 will need spots 33-64 to be created, OR we store the route number without a spot link for now. Check actual belt spot count during implementation.

### 3. Routes Page Update

- Add **Load Location** column to the routes table (shows human-readable label).
- Add **Load Location** dropdown to RouteModal with options: Doc, Unload, Label Facer, Scanner, Splitter, FO, Puller.

### 4. Facility Spot Display

Each belt spot in the facility view displays its route number. The route is looked up via the Routes table (where `beltSpotId` matches the spot). This info appears on the spot card.

### 5. Facility Spot Click (AssignmentModal)

When a manager clicks a spot, the modal shows:
- Route number assigned to this spot (from Routes table)
- Route selector dropdown to change which route is on this spot
- Load location dropdown (editable, saves to the route's `loadLocation` field)
- Existing driver/truck assignment info (unchanged)
