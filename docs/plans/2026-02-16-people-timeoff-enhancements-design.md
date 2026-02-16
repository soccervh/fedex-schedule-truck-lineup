# People & Time Off Enhancements Design

## Overview

Enhance the People page with a dedicated person detail page and expand the time off system with granular balance tracking, new leave types, schedule-aware vacation weeks, and manager notifications.

## Database Changes

### New Enums

**WorkSchedule:**
- `MON_FRI` — Monday through Friday
- `TUE_SAT` — Tuesday through Saturday

### Updated Enum: TimeOffType

- `VACATION_WEEK` (new) — deducts from vacationWeeks, creates 5 weekday records
- `VACATION_DAY` (new) — deducts from vacationDays
- `PERSONAL` (new) — deducts from personalDays
- `HOLIDAY` (new) — deducts from holidays
- `SICK` (existing) — deducts from sickDays
- `SCHEDULED_OFF` (existing) — no balance impact

### User Model Additions

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| vacationWeeks | Int | 0 | Allocated full weeks per year |
| vacationDays | Int | 0 | Allocated individual vacation days per year |
| personalDays | Int | 0 | Allocated personal days per year |
| holidays | Int | 0 | Allocated holidays per year |
| sickDays | Int | 0 | Allocated sick days per year |
| sickDayCarryover | Int | 0 | Rolled-over sick days from prior year |
| balanceResetDate | DateTime | Current June 1st | Tracks when balances were last reset |
| workSchedule | WorkSchedule | MON_FRI | Person's weekly work schedule |

### Balance Math

- When a request is **approved**, deduct from the corresponding balance.
- When a previously approved request is **denied**, restore the balance.
- Vacation week approval deducts 1 from `vacationWeeks`.
- All other types deduct number of days requested from the matching field.

### June 1st Reset Logic (Lazy)

On any API call that reads a user's balances, check if `balanceResetDate` is before the current June 1st:
- Reset vacationWeeks, vacationDays, personalDays, holidays to 0 (manager re-allocates).
- Sick day carryover = min(remaining sick days, 10). Reset sickDays to 0, set sickDayCarryover.
- Update `balanceResetDate` to current June 1st.

No cron job required.

## Person Detail Page

**Route:** `/people/:id`

### Layout

**Top:** Back link to People list.

**Left — Person Info Card:**
- Name (editable)
- Email (editable)
- Phone (editable)
- Role dropdown (DRIVER, SWING, MANAGER, CSA, HANDLER)
- Home Area dropdown (FO, DOC, UNLOAD, PULLER, UNASSIGNED)
- Work Schedule dropdown (MON_FRI, TUE_SAT)
- Save button

**Right — Time Off Balances Card:**

| Type | Allocated | Used | Remaining |
|------|-----------|------|-----------|
| Vacation Weeks | 3 | 1 | 2 |
| Vacation Days | 5 | 2 | 3 |
| Personal Days | 3 | 0 | 3 |
| Holidays | 6 | 2 | 4 |
| Sick Days | 5 (+2 carryover) | 1 | 6 |

- "Allocated" column is editable by managers (this is how managers set availability).
- "Used" is calculated from approved time off records.
- "Remaining" = Allocated + Carryover - Used.
- Save button for balance changes.

**Below — Time Off History:**
- Table: Date(s), Type, Status (color-coded badge), Note
- Sorted by date descending
- Manager can approve/deny pending requests inline

### Access Control
- Managers can view/edit any person.
- Non-managers can only view their own page.

## Time Off Request Flow

### Requesting (MySchedule page)

1. User picks a **type** from expanded dropdown: Vacation Week, Vacation Day, Personal, Holiday, Sick, Scheduled Off.
2. If **Vacation Week**:
   - MON_FRI schedule: must pick a Monday, auto-creates Mon-Fri records.
   - TUE_SAT schedule: must pick a Tuesday, auto-creates Tue-Sat records.
   - Shows the 5 dates for confirmation.
3. Other types: pick one or more individual dates.
4. Show remaining balance next to type dropdown.
5. Warn if request would exceed balance, but still allow submission.
6. Request created as PENDING.

### Approval (Manager)

- Visible on TimeOff page and Person Detail page.
- Approve: status -> APPROVED, balance deducted.
- Deny: status -> DENIED, no balance change.
- Re-deny after approval: balance restored.

### Validation

- Vacation Week start date must match work schedule (Monday for MON_FRI, Tuesday for TUE_SAT).
- Can't request same date twice (existing unique constraint).

## Manager Notifications

### In-App Badge

- Badge/counter on "Time Off" nav link showing PENDING request count.
- New endpoint: `GET /api/timeoff/pending-count`.
- Only visible to MANAGER role.
- Polls every 60 seconds.

### Email Notification

- On new time off request, email all active managers.
- Contains: requester name, type, date(s), link to TimeOff page.
- Nodemailer with SMTP config via env vars: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`.
- Fire-and-forget with error logging. If SMTP not configured, skip silently.

## API Changes

| Method | Endpoint | Change |
|--------|----------|--------|
| GET | `/api/people/:id` | New — returns person with balances + time off history |
| PUT | `/api/people/:id` | Update — support new fields (balances, workSchedule) |
| GET | `/api/timeoff/pending-count` | New — pending request count for badge |
| POST | `/api/timeoff/request` | Update — new types, vacation week auto-fill, balance check, email |
| PATCH | `/api/timeoff/:id` | Update — approval deducts/restores balances |

## Frontend Changes

- **New page:** `/people/:id` — Person Detail
- **People page:** Names become links to detail page
- **MySchedule:** Expanded type dropdown, vacation week start-date picker, remaining balances shown
- **TimeOff page:** Handle new types in display
- **Nav:** Pending request badge for managers
- **PersonModal:** Add workSchedule dropdown

## New Dependencies

- `nodemailer` (server) — SMTP email sending
