-- Add duration column to Assignment
ALTER TABLE "Assignment" ADD COLUMN IF NOT EXISTS "duration" TEXT NOT NULL DEFAULT 'TODAY';
