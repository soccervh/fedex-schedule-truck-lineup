-- CreateEnum
CREATE TYPE "RouteArea" AS ENUM ('EO_POOL', 'UNLOAD', 'DOCK', 'BELT_SPOT');

-- CreateTable
CREATE TABLE "Route" (
    "id" SERIAL NOT NULL,
    "number" TEXT NOT NULL,
    "assignedArea" "RouteArea" NOT NULL,
    "beltSpotId" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Route_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyBriefing" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "startTime" TEXT,
    "planeArrival" TEXT,
    "lateFreight" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyBriefing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Route_number_key" ON "Route"("number");

-- CreateIndex
CREATE UNIQUE INDEX "DailyBriefing_date_key" ON "DailyBriefing"("date");

-- AddForeignKey
ALTER TABLE "Route" ADD CONSTRAINT "Route_beltSpotId_fkey" FOREIGN KEY ("beltSpotId") REFERENCES "Spot"("id") ON DELETE SET NULL ON UPDATE CASCADE;
