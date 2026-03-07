-- AlterTable: remove homeArea column from User (idempotent)
ALTER TABLE "User" DROP COLUMN IF EXISTS "homeArea";

-- DropEnum (idempotent)
DROP TYPE IF EXISTS "HomeArea";
