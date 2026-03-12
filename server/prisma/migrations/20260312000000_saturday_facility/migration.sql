-- Add schedule column to FacilityArea
ALTER TABLE "FacilityArea" ADD COLUMN IF NOT EXISTS "schedule" TEXT NOT NULL DEFAULT 'WEEKDAY';
