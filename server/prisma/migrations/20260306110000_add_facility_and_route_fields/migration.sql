-- CreateEnum (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LoadLocation') THEN
    CREATE TYPE "LoadLocation" AS ENUM ('UNASSIGNED', 'DOC', 'UNLOAD', 'LABEL_FACER', 'SCANNER', 'SPLITTER', 'FO', 'PULLER');
  END IF;
END $$;

-- CreateEnum (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RouteSchedule') THEN
    CREATE TYPE "RouteSchedule" AS ENUM ('MON_FRI', 'TUE_FRI', 'SAT_ONLY');
  END IF;
END $$;

-- CreateTable (idempotent)
CREATE TABLE IF NOT EXISTS "FacilityArea" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "subArea" TEXT,

    CONSTRAINT "FacilityArea_pkey" PRIMARY KEY ("id")
);

-- CreateTable (idempotent)
CREATE TABLE IF NOT EXISTS "FacilitySpot" (
    "id" SERIAL NOT NULL,
    "areaId" INTEGER NOT NULL,
    "number" INTEGER NOT NULL,
    "label" TEXT,
    "side" TEXT,

    CONSTRAINT "FacilitySpot_pkey" PRIMARY KEY ("id")
);

-- CreateTable (idempotent)
CREATE TABLE IF NOT EXISTS "FacilityAssignment" (
    "id" TEXT NOT NULL,
    "facilitySpotId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FacilityAssignment_pkey" PRIMARY KEY ("id")
);

-- AlterTable: add new columns to Route (idempotent)
ALTER TABLE "Route" ADD COLUMN IF NOT EXISTS "facilitySpotId" INTEGER;
ALTER TABLE "Route" ADD COLUMN IF NOT EXISTS "loadLocation" "LoadLocation";
ALTER TABLE "Route" ADD COLUMN IF NOT EXISTS "schedule" "RouteSchedule" NOT NULL DEFAULT 'MON_FRI';

-- CreateIndex (idempotent)
CREATE UNIQUE INDEX IF NOT EXISTS "FacilitySpot_areaId_number_key" ON "FacilitySpot"("areaId", "number");

-- CreateIndex (idempotent)
CREATE UNIQUE INDEX IF NOT EXISTS "FacilityAssignment_facilitySpotId_date_key" ON "FacilityAssignment"("facilitySpotId", "date");

-- AddForeignKey (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FacilitySpot_areaId_fkey') THEN
    ALTER TABLE "FacilitySpot" ADD CONSTRAINT "FacilitySpot_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "FacilityArea"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FacilityAssignment_facilitySpotId_fkey') THEN
    ALTER TABLE "FacilityAssignment" ADD CONSTRAINT "FacilityAssignment_facilitySpotId_fkey" FOREIGN KEY ("facilitySpotId") REFERENCES "FacilitySpot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FacilityAssignment_userId_fkey') THEN
    ALTER TABLE "FacilityAssignment" ADD CONSTRAINT "FacilityAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Route_facilitySpotId_fkey') THEN
    ALTER TABLE "Route" ADD CONSTRAINT "Route_facilitySpotId_fkey" FOREIGN KEY ("facilitySpotId") REFERENCES "FacilitySpot"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
