-- CreateEnum
CREATE TYPE "TruckType" AS ENUM ('REACH', 'NINE_HUNDRED', 'SPRINTER_VAN', 'RENTAL', 'UNKNOWN');

-- AlterTable
ALTER TABLE "Truck" ADD COLUMN     "truckType" "TruckType" NOT NULL DEFAULT 'UNKNOWN';
