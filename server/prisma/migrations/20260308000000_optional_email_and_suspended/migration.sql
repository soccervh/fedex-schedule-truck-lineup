-- AlterTable: make email optional
ALTER TABLE "User" ALTER COLUMN "email" DROP NOT NULL;

-- AlterTable: add isSuspended
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isSuspended" BOOLEAN NOT NULL DEFAULT false;
