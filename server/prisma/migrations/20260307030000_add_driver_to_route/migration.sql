-- AlterTable
ALTER TABLE "Route" ADD COLUMN IF NOT EXISTS "driverId" TEXT;

-- AddForeignKey
ALTER TABLE "Route" ADD CONSTRAINT "Route_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
