-- Add shift column to User (AM or PM)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "shift" TEXT NOT NULL DEFAULT 'AM';

-- Set PM shift for Thomas Cahill's and Donte Allen's people
UPDATE "User" SET "shift" = 'PM'
WHERE "managerId" IN (
  SELECT id FROM "User" WHERE name IN ('Thomas Cahill', 'Donte Allen')
);

-- Set the managers themselves as PM too
UPDATE "User" SET "shift" = 'PM'
WHERE name IN ('Thomas Cahill', 'Donte Allen');
