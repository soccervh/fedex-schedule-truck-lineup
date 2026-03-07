-- AlterTable
ALTER TABLE "Route" ADD COLUMN IF NOT EXISTS "pullerBeltSpotId" INTEGER;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Route_pullerBeltSpotId_fkey'
  ) THEN
    ALTER TABLE "Route" ADD CONSTRAINT "Route_pullerBeltSpotId_fkey" FOREIGN KEY ("pullerBeltSpotId") REFERENCES "Spot"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
