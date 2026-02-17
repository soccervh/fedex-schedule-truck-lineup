# Invite-Only Registration with Access Levels

## Overview

Replace open user creation with an invite-only system. Managers send email invite links to new employees, who set their own passwords. Add a tiered access level system separate from scheduling roles to control what users can see and do.

## Data Model Changes

### New `accessLevel` field on User

An enum with four tiers (highest to lowest):

- `HIGHEST_MANAGER` - Full access to everything
- `OP_LEAD` - Scheduling, time-off approval for assigned employees, view all
- `TRUCK_MOVER` - View lineup and move trucks/assignments
- `EMPLOYEE` - View own schedule, request time off

This is separate from the existing `role` field (DRIVER, SWING, CSA, HANDLER), which continues to determine where a person appears in the lineup/scheduling.

### New `managerId` field on User

- Optional self-reference to another User (their primary manager)
- A manager can have many employees assigned to them
- Any user with access level HIGHEST_MANAGER or OP_LEAD can be assigned as a primary manager

### New `InviteToken` model

| Field      | Type     | Description                              |
|------------|----------|------------------------------------------|
| id         | String   | Unique ID (cuid)                         |
| token      | String   | Secure random string (used in URL)       |
| userId     | String   | The User this invite is for              |
| expiresAt  | DateTime | 48 hours from creation                   |
| usedAt     | DateTime | Null until employee accepts              |
| createdAt  | DateTime | When the invite was generated            |

### User model modifications

- Remove `password` as a required field (null until invite accepted)
- `isActive` starts as `false` for invited users, set to `true` on invite acceptance
- Remove the existing `MANAGER` role from the Role enum (replaced by access levels)

## Access Level Permissions

| Capability                  | Highest Manager | OP Lead | Truck Mover | Employee |
|-----------------------------|-----------------|---------|-------------|----------|
| Invite/create users         | Yes             | No      | No          | No       |
| Deactivate/delete users     | Yes             | No      | No          | No       |
| Edit any employee info      | Yes             | No      | No          | No       |
| Edit lineup/scheduling      | Yes             | Yes     | No          | No       |
| Approve time off (anyone)   | Yes             | No      | No          | No       |
| Approve time off (assigned) | Yes             | Yes     | No          | No       |
| View all employees          | Yes             | Yes     | No          | No       |
| Move trucks/assignments     | Yes             | Yes     | Yes         | No       |
| View own schedule           | Yes             | Yes     | Yes         | Yes      |
| Request time off            | Yes             | Yes     | Yes         | Yes      |

## Invite Flow

### Step 1: Manager sends invite

1. Highest Level Manager opens People page and clicks "Invite Employee"
2. Fills in: name, email, role (for scheduling), home area, work schedule, phone (optional)
3. Selects access level from dropdown
4. Selects primary manager from dropdown of all HIGHEST_MANAGER and OP_LEAD users
5. Submits the form

### Step 2: System creates user and sends email

1. Creates User record with no password, `isActive: false`
2. Generates a secure random token (crypto.randomBytes)
3. Stores InviteToken with 48-hour expiry
4. Sends email via nodemailer with invite link: `/invite/accept?token=<token>`

### Step 3: Employee accepts invite

1. Employee clicks the link in their email
2. App validates the token (exists, not expired, not already used)
3. Shows a welcome page with their name pre-filled
4. Employee sets their password and optionally adds/updates phone number
5. On submit: password is hashed and saved, `isActive` set to `true`, token marked as used
6. Employee is logged in automatically (or redirected to login)

### Step 4: Invite management

- If a link expires, any Highest Level Manager can resend (generates new 48-hour token)
- Pending invites (not yet accepted) are visible to managers
- Expired invites can be resent with one click

## Manager Assignment

- Each employee has one primary manager, selected during invite
- Any Highest Level Manager can reassign an employee's primary manager later
- Time-off notification emails go to the assigned manager only
- All Highest Level Managers and OP Leads can still view and manage within their permission level regardless of assignment

## Migration from Current System

- Existing users with role `MANAGER` get access level `HIGHEST_MANAGER`
- Existing users with other roles get access level `EMPLOYEE`
- Existing passwords remain intact
- `managerId` starts as null for existing users (can be assigned after migration)

## Email Template

Subject: "You've been invited to FedEx Truck Lineup"

Body includes:
- Welcome message with employee name
- Link to set up their account
- Note that the link expires in 48 hours
- Who invited them (manager name)

## API Changes

### New endpoints

- `POST /api/invites` - Send an invite (Highest Manager only)
- `POST /api/invites/:id/resend` - Resend an expired/pending invite (Highest Manager only)
- `GET /api/invites/pending` - List pending invites (Highest Manager only)
- `POST /api/auth/accept-invite` - Accept invite and set password (public, token-validated)
- `GET /api/auth/validate-invite?token=<token>` - Check if invite token is valid (public)

### Modified endpoints

- `POST /api/people` - Updated to require access level, manager assignment
- `GET /api/people` - Filtered by access level (OP Lead+ sees all, others see limited)
- `PATCH /api/timeoff/:id` - Check access level instead of role for approval rights
- Time-off notification emails sent to assigned manager only

### Middleware changes

- Replace `requireManager` middleware with `requireAccessLevel(level)` that checks the tiered access
- Access level checks: a level grants all permissions of lower levels
