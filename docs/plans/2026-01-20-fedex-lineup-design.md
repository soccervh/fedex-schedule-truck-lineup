# FedEx Truck Lineup Scheduling System - Design Document

## Overview

A web application for managing FedEx truck lineup scheduling across 4 belts with 32 spots each. Managers assign drivers to spots, track time-off, and coordinate swing driver coverage.

## Users & Access

| Role | Access Level |
|------|--------------|
| Manager | Full CRUD - schedules, people, assignments, time-off approval |
| Driver | Read-only - view assignments, submit time-off requests |

## Tech Stack

- **Frontend:** React + TypeScript, Shadcn/UI components, Tailwind CSS
- **Backend:** Node.js with Express, REST API
- **Database:** PostgreSQL
- **Auth:** JWT-based with role permissions

## Data Model

### People
- Name
- Home area (belt / dock / unload)
- Role (driver / swing / manager)
- Email (for login)
- Phone (optional)
- Status (active / inactive)

### Belts & Spots
- 4 belts, numbered 1-4
- Each belt has 32 spots, numbered 1-32
- Spots are fixed positions

### Assignments
- Links a person to a spot on a specific date
- Includes truck number (6+ digits)
- Tracks whether it's from template or an override

### Schedule Templates
- Base weekly schedule (Monday-Sunday)
- Each spot has a default person assigned
- Template changes don't affect past days

### Time Off
- Person reference
- Date(s)
- Type (vacation / sick / scheduled off)
- Source (imported / requested)
- Status (pending / approved / denied)
- Notes

## Color Coding System

| Color | Meaning |
|-------|---------|
| Blue | Belt worker (in home area) |
| Orange | Dock worker |
| Green | Unload worker |
| Gray | Swing driver filling in |
| Red border | Spot needs coverage |

## Main Interface

### Navigation
- Top bar with belt selector tabs (Belt 1-4)
- Quick stats: spots filled, spots needing coverage, swing drivers available
- Date picker for viewing/editing any day

### Belt View (Main Screen)
- 32 spots in grid layout
- Each spot displays:
  - Spot number
  - Assigned person's name (color-coded by home area)
  - Truck number
  - Coverage alert if person is off

### Sidebar
- List of swing drivers
- Availability status (available / assigned / off)

## Time-Off Management

### Import
- CSV upload from HR/payroll
- Format: Name, Date, Type
- Preview before applying with mismatch flagging

### In-App Requests
- Drivers submit requests with date(s) and optional note
- Managers see pending queue
- Approve/deny with one click

## Coverage Workflow

1. System checks assigned people against time-off records
2. Flags spots where assigned person is off
3. Shows alert banner with coverage needs
4. Click flagged spot to assign swing driver
5. Original assignment preserved in template

## Weekly Template System

### Template Mode
- Edit base weekly schedule
- Drag-and-drop or click-to-assign
- "Apply template to date range" for bulk population

### Daily Overrides
- Changes on specific dates don't affect template
- Visual indicator when spot differs from template
- "Reset to template" option per spot or day

### Copy Feature
- Copy schedule from another day
- Useful for unusual weeks

## Driver View

- My Assignment Today (prominent card)
- My Schedule (week view)
- My Time-Off (list + request form)
- No access to edit or view other drivers' personal details

## People Management (Managers)

- Table view with filters (area, role, status)
- Add/edit/deactivate people
- CSV bulk import for initial setup
