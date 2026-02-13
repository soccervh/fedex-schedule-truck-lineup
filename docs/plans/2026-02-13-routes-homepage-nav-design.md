# Routes, Homepage, and Navigation Redesign

## Summary

Add a Routes management page, a daily operations briefing homepage, restructure navigation, and clean up the People page.

## Changes

### 1. Navigation Changes

- Rename "FedEx Truck Lineup" to "FedEx" in the header.
- Add a Home icon button to the left of "FedEx" that navigates to `/`.
- Move Facility from `/` to `/facility`.
- Updated nav links (manager): Home, Facility, Truck Lineup, Routes, People, Time Off.
- Updated nav links (non-manager): Home, My Schedule.

### 2. Homepage (`/`) — Daily Operations Briefing

A daily bulletin board visible to all users. Managers can edit; everyone else sees read-only.

**Sections:**
- **Start Time** — clock-in time for the day (manager-entered).
- **Plane Arrival** — expected plane landing time (manager-entered).
- **Late Freight** — text notes about late freight (manager-entered).
- **Route Changes** — auto-detected from assignments: shows routes that differ from their normal/template assignment so swing drivers know where they're working.

**New DB model:** `DailyBriefing`
- `id`: String (CUID, primary key)
- `date`: DateTime @db.Date (unique)
- `startTime`: String? (e.g., "3:30 AM")
- `planeArrival`: String? (e.g., "4:15 AM")
- `lateFreight`: String? (free-text notes)
- `createdAt`: DateTime
- `updatedAt`: DateTime

**New API endpoints:**
- `GET /api/briefing?date=YYYY-MM-DD` — get briefing for date (all users)
- `PUT /api/briefing` — create/update briefing for date (manager only)

**Route changes detection:** Compare current day's route assignments against template/default assignments. Any route assigned to a different area or spot than its default shows up as a change.

### 3. Routes Page (`/routes`) — Manager Only

Table view for managing delivery routes.

**Table columns:** Route Number, Assigned Area (dropdown selector), Actions (edit/delete).

**Assigned Area options:** EO Pool, Unload, Dock, or a specific Belt spot (e.g., "Belt A - Spot 12").

**Add Route** button opens a modal to create a new route.

**New DB model:** `Route`
- `id`: Int (autoincrement, primary key)
- `number`: String (unique, e.g., "101", "202")
- `assignedArea`: Enum [EO_POOL, UNLOAD, DOCK, BELT_SPOT]
- `beltSpotId`: Int? (foreign key to Spot, when assignedArea is BELT_SPOT)
- `isActive`: Boolean (default: true)
- `createdAt`: DateTime
- `updatedAt`: DateTime

**New API endpoints:**
- `GET /api/routes` — list all active routes (all users, needed for homepage route changes)
- `POST /api/routes` — create route (manager only)
- `PUT /api/routes/:id` — update route (manager only)
- `DELETE /api/routes/:id` — deactivate route (manager only)

### 4. People Page Changes

- Remove the Home Area column from the people table.
- Remove the Home Area dropdown from the PersonModal create/edit form.
- Keep all other functionality (name, email, role, phone, actions).

### 5. Facility Page

- Route changes from `/` to `/facility`.
- No functionality changes.
