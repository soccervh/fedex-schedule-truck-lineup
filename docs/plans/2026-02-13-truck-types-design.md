# Truck Types Design

## Goal

Add a truck type field to distinguish between Reach, 900, Sprinter Van, Rental, and Unknown trucks. Displayed on lineup cards and in the create/edit modal. Defaults to Unknown for new and existing trucks.

## Enum Values

| Enum Value     | Display Label |
|----------------|---------------|
| REACH          | Reach         |
| NINE_HUNDRED   | 900           |
| SPRINTER_VAN   | Sprinter Van  |
| RENTAL         | Rental        |
| UNKNOWN        | Unknown       |

## Changes

### 1. Prisma Schema

- Add `TruckType` enum with values above
- Add `truckType TruckType @default(UNKNOWN)` to the Truck model
- Run migration (existing trucks get `UNKNOWN` automatically)

### 2. API (server/src/routes/trucks.ts)

- Accept `truckType` on POST (create) and PATCH (update)
- Already included in responses via Prisma's default include

### 3. Client Type (client/app/types/lineup.ts)

- Add `truckType` to the `Truck` interface

### 4. TruckModal (client/app/components/TruckModal.tsx)

- Add dropdown for truck type selection
- Default to UNKNOWN when creating new truck
- Show current type when editing

### 5. Lineup Cards (client/app/components/TruckLineupView.tsx)

- Display truck type label on truck cards in available/out-of-service sidebars and belt spots
