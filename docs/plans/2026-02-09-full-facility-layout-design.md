# Full Facility Layout Design

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign UI to show complete facility layout with Unload, Dock, FO, and Belt areas.

---

## Facility Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│                            UNLOAD                                    │
│   [1] [2] [3]                           [4] [5] [6]                  │
│   (D/C side)                            (B/A side)                   │
├─────────────────────────────────────────────────────────────────────┤
│                             DOC                                      │
│   [8] [7] [6] [5] [4] [3] [2] [1]  Secondary                        │
│   [QB1] [QB2]                      Quarterback                       │
│   [1] [2] [3] [4] [5] [6] [7] [8]  Fine Sort                        │
│   [QB1] [Ramp1] [Ramp2]            Quarterback + Ramps               │
├─────────────────────────────────────────────────────────────────────┤
│                            BELTS                                     │
│                             NORTH                                    │
│   ┌─────┐ ┌─────┐    ┌────┐    ┌─────┐ ┌─────┐                      │
│   │  D  │ │  C  │    │ FO │    │  B  │ │  A  │                      │
│   │Belt │ │Belt │    │  1 │    │Belt │ │Belt │                      │
│   │ 32  │ │ 32  │    │... │    │ 32  │ │ 32  │                      │
│   │spots│ │spots│    │ 20 │    │spots│ │spots│                      │
│   └─────┘ └─────┘    └────┘    └─────┘ └─────┘                      │
│   (left side)         (mid)     (right side)                         │
│                             SOUTH                                    │
└─────────────────────────────────────────────────────────────────────┘
```

## Areas and Spot Counts

| Area | Sub-Area | Spots | Notes |
|------|----------|-------|-------|
| UNLOAD | D/C Side | 3 | Spots 1-3 |
| UNLOAD | B/A Side | 3 | Spots 4-6 |
| DOC | Secondary | 8 | Numbered 8 down to 1 |
| DOC | Quarterback (upper) | 2 | QB1, QB2 |
| DOC | Fine Sort | 8 | Numbered 1-8 |
| DOC | Quarterback (lower) | 1 | QB1 |
| DOC | Ramp | 2 | Ramp1, Ramp2 |
| BELTS | D Belt | 32 | Left side |
| BELTS | C Belt | 32 | Left side |
| BELTS | FO | 20 | Center, north to south |
| BELTS | B Belt | 32 | Right side |
| BELTS | A Belt | 32 | Right side |

**Total spots:** 6 + 21 + 148 = 175 spots

## Color Coding

| Color | Position/Home Area |
|-------|-------------------|
| Blue | FO driver |
| Orange | Dock worker |
| Green | Unload worker |
| Yellow | Puller |
| Gray | Swing driver |
| Split (gray + color) | Swing filling in (other color = original person's home area) |

## Data Model Updates

### HomeArea Enum
Change from: BELT, DOCK, UNLOAD
To: FO, DOCK, UNLOAD, PULLER

### New Area Model
```prisma
model Area {
  id        Int      @id @default(autoincrement())
  name      String   // "UNLOAD", "DOC", "BELTS"
  subArea   String?  // "Secondary", "Quarterback", "Fine Sort", "Ramp", "FO", or null for belts
  spots     AreaSpot[]
}

model AreaSpot {
  id        Int      @id @default(autoincrement())
  areaId    Int
  area      Area     @relation(fields: [areaId], references: [id])
  number    Int
  label     String?  // "QB1", "Ramp1", etc.
  side      String?  // "DC" or "BA" for unload spots

  assignments AreaAssignment[]

  @@unique([areaId, number])
}

model AreaAssignment {
  id          String   @id @default(cuid())
  areaSpotId  Int
  areaSpot    AreaSpot @relation(fields: [areaSpotId], references: [id])
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  date        DateTime @db.Date

  @@unique([areaSpotId, date])
}
```

## UI Components

### FacilityView (updated)
- Shows all three sections: Unload, Doc, Belts
- Scrollable if needed
- Maintains sidebar for "Needs Fill"

### UnloadSection
- 3 spots on left (D/C side)
- Gap in middle
- 3 spots on right (B/A side)

### DocSection
- Secondary row (8 spots, numbered 8-1)
- Quarterback row (2 spots)
- Fine Sort row (8 spots, numbered 1-8)
- Bottom row: QB1 + Ramp1 + Ramp2

### BeltsSection
- Left group: D Belt, C Belt
- Center: FO (20 spots vertical)
- Right group: B Belt, A Belt

### SpotCard (updated)
- Support for split colors (swing + original home area)
- Show appropriate color based on position
