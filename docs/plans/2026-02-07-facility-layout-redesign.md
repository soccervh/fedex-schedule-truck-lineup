# Facility Layout Redesign

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign the UI to match the physical FedEx facility layout with all 4 belts visible.

**Architecture:** Replace tab-based single-belt view with facility overview showing all belts, plus detailed belt view on double-click.

---

## Data Model Changes

### Belt Naming
| Current | New Name | Letter |
|---------|----------|--------|
| Belt 1  | Belt 100 | A Belt |
| Belt 2  | Belt 200 | B Belt |
| Belt 3  | Belt 300 | C Belt |
| Belt 4  | Belt 400 | D Belt |

### Spot Naming
Spots use belt letter + number: A1, A2... A32, B1, B2... B32, etc.

### Route Numbers (Calculated)
Route number = belt base + (spot number × 2)

| Belt | Spot 1 | Spot 2 | Spot 32 |
|------|--------|--------|---------|
| A (100) | 102 | 104 | 164 |
| B (200) | 202 | 204 | 264 |
| C (300) | 302 | 304 | 364 |
| D (400) | 402 | 404 | 464 |

Route numbers are auto-calculated, not stored or manually entered.

---

## Facility Overview (Main View)

### Layout
```
              NORTH
┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐  ┌──────────────┐
│  D Belt   │ │  C Belt   │ │  B Belt   │ │  A Belt   │  │ NEEDS FILL   │
├───────────┤ ├───────────┤ ├───────────┤ ├───────────┤  ├──────────────┤
│D1   R:402 │ │C1   R:302 │ │B1   R:202 │ │A1   R:102 │  │ C2   R:304   │
│Smith      │ │Jones      │ │Lee        │ │Garcia     │  │ (Johnson off)│
│T: 123456  │ │T: 234567  │ │T: 345678  │ │T: 456789  │  ├──────────────┤
├───────────┤ ├───────────┤ ├───────────┤ ├───────────┤  │ A15  R:130   │
│D2   R:404 │ │░░░░░░░░░░░│ │B2   R:204 │ │A2   R:104 │  │ (Martinez off│
│Brown      │ │░C2  R:304░│ │Davis      │ │Wilson     │  ├──────────────┤
│T: 123457  │ │░OPEN░░░░░░│ │T: 345679  │ │T: 456790  │  │ 3 spots open │
├───────────┤ ├───────────┤ ├───────────┤ ├───────────┤  └──────────────┘
│    ...    │ │    ...    │ │    ...    │ │    ...    │
              SOUTH
```

### Spot Card Content
- Line 1: Spot + Route (e.g., "D1  R:402")
- Line 2: Person's name
- Line 3: Truck number (e.g., "T: 123456")

### Belt Arrangement
- Left to right: D Belt, C Belt, B Belt, A Belt (400, 300, 200, 100)
- North at top (spot 1), South at bottom (spot 32)
- Scrollable vertically for all 32 spots

### Color Coding
- Blue: Belt worker (home area)
- Orange: Dock worker
- Green: Unload worker
- Gray: Swing driver filling in
- Red/highlighted: Spot needs coverage

### Needs Fill Sidebar
- Fixed panel on right side
- Lists all spots needing coverage
- Each item shows: Spot, Route, Reason (person off, vacant)
- Shows total count at bottom
- Click item to jump to that spot

---

## Detailed Belt View

Accessed by double-clicking any spot in the facility overview.

### Layout
```
┌─────────────────────────────────────────────────────────┬──────────────┐
│  ← Back to Facility    │  C Belt    │  [Date Picker]    │ NEEDS FILL   │
├─────────────────────────────────────────────────────────┤──────────────┤
│                          NORTH                          │ C2   R:304   │
│ ┌─────────────────────────────────────────────────────┐ │ Johnson      │
│ │ C1   R:302                                          │ │ (Vacation)   │
│ │ Jones, Michael                                      │ ├──────────────┤
│ │ T: 234567                                           │ │              │
│ │ Home: Belt  │  From Template                        │ │ 1 spot open  │
│ ├─────────────────────────────────────────────────────┤ └──────────────┘
│ │ C2   R:304                                 ⚠ OPEN   │
│ │ Johnson, Tyler  ← OFF (Vacation: "Family trip")     │
│ │ T: 234568                                           │
│ │ Home: Belt  │  From Template  │  NEEDS COVERAGE     │
│ ├─────────────────────────────────────────────────────┤
│ │ C3   R:306                                          │
│ │ Williams, Sarah                                     │
│ │ T: 234569                                           │
│ │ Home: Dock  │  ✎ Override (was: Peters)             │
│                          SOUTH
└─────────────────────────────────────────────────────────┘
```

### Additional Details Shown
- Full name (First, Last)
- Home area (Belt/Dock/Unload)
- Template vs Override indicator
- Time-off reason and notes when person is off
- "NEEDS COVERAGE" flag for open spots

### Navigation
- "← Back to Facility" button at top left
- "Facility View" link also available
- Needs Fill sidebar remains visible

---

## Interactions

### Facility Overview
| Action | Result |
|--------|--------|
| Single click spot | Opens edit modal |
| Double-click spot | Zooms to detailed belt view |
| Click sidebar item | Opens edit modal for that spot |

### Detailed Belt View
| Action | Result |
|--------|--------|
| Single click spot | Opens edit modal |
| Click "← Back to Facility" | Returns to facility overview |
| Click "Facility View" link | Returns to facility overview |
| Click sidebar item | Opens edit modal for that spot |

### Edit Modal
- Select person from dropdown
- Enter truck number
- Shows available swing drivers when spot needs coverage
- Save/Cancel buttons

---

## Implementation Notes

### Database Changes
- Update Belt model: add `letter` field (A/B/C/D) and `baseNumber` (100/200/300/400)
- Spot display name is computed: `${belt.letter}${spot.number}`
- Route number is computed: `belt.baseNumber + (spot.number * 2)`

### Component Changes
- Replace `BeltSelector` tabs with `FacilityView` component
- Create `BeltColumn` component for rendering a single belt
- Create `SpotCardCompact` for facility overview
- Create `SpotCardDetailed` for belt detail view
- Create `NeedsFillSidebar` component
- Update `SpotGrid` to vertical layout (north to south)

### State Management
- Add `selectedBelt` state for toggling between facility/detail view
- Track which spot was clicked for edit modal
- Filter coverage needs for sidebar
