-- CreateEnum
CREATE TYPE "LoadLocation" AS ENUM ('UNASSIGNED', 'DOC', 'UNLOAD', 'LABEL_FACER', 'SCANNER', 'SPLITTER', 'FO', 'PULLER');

-- CreateEnum
CREATE TYPE "RouteSchedule" AS ENUM ('MON_FRI', 'TUE_FRI', 'SAT_ONLY');

-- CreateTable
CREATE TABLE "FacilityArea" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "subArea" TEXT,

    CONSTRAINT "FacilityArea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FacilitySpot" (
    "id" SERIAL NOT NULL,
    "areaId" INTEGER NOT NULL,
    "number" INTEGER NOT NULL,
    "label" TEXT,
    "side" TEXT,

    CONSTRAINT "FacilitySpot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FacilityAssignment" (
    "id" TEXT NOT NULL,
    "facilitySpotId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FacilityAssignment_pkey" PRIMARY KEY ("id")
);

-- AlterTable: add new columns to Route
ALTER TABLE "Route" ADD COLUMN "facilitySpotId" INTEGER;
ALTER TABLE "Route" ADD COLUMN "loadLocation" "LoadLocation";
ALTER TABLE "Route" ADD COLUMN "schedule" "RouteSchedule" NOT NULL DEFAULT 'MON_FRI';

-- CreateIndex
CREATE UNIQUE INDEX "FacilitySpot_areaId_number_key" ON "FacilitySpot"("areaId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "FacilityAssignment_facilitySpotId_date_key" ON "FacilityAssignment"("facilitySpotId", "date");

-- AddForeignKey
ALTER TABLE "FacilitySpot" ADD CONSTRAINT "FacilitySpot_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "FacilityArea"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacilityAssignment" ADD CONSTRAINT "FacilityAssignment_facilitySpotId_fkey" FOREIGN KEY ("facilitySpotId") REFERENCES "FacilitySpot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacilityAssignment" ADD CONSTRAINT "FacilityAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Route" ADD CONSTRAINT "Route_facilitySpotId_fkey" FOREIGN KEY ("facilitySpotId") REFERENCES "FacilitySpot"("id") ON DELETE SET NULL ON UPDATE CASCADE;
