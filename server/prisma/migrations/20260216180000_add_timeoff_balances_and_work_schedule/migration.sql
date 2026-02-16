-- CreateEnum
CREATE TYPE "WorkSchedule" AS ENUM ('MON_FRI', 'TUE_SAT');

-- AlterEnum: Expand TimeOffType (VACATION -> VACATION_DAY, add new types)
CREATE TYPE "TimeOffType_new" AS ENUM ('VACATION_WEEK', 'VACATION_DAY', 'PERSONAL', 'HOLIDAY', 'SICK', 'SCHEDULED_OFF');

-- Convert column to new enum, mapping VACATION -> VACATION_DAY in the USING clause
ALTER TABLE "TimeOff" ALTER COLUMN "type" TYPE "TimeOffType_new"
  USING (
    CASE "type"::text
      WHEN 'VACATION' THEN 'VACATION_DAY'
      ELSE "type"::text
    END
  )::"TimeOffType_new";

ALTER TYPE "TimeOffType" RENAME TO "TimeOffType_old";
ALTER TYPE "TimeOffType_new" RENAME TO "TimeOffType";
DROP TYPE "TimeOffType_old";

-- AlterTable: Add new fields to User
ALTER TABLE "User" ADD COLUMN     "workSchedule" "WorkSchedule" NOT NULL DEFAULT 'MON_FRI',
ADD COLUMN     "vacationWeeks" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "vacationDays" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "personalDays" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "holidays" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "sickDays" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "sickDayCarryover" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "balanceResetDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
