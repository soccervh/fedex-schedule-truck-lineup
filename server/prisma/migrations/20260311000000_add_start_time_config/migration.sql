-- CreateTable
CREATE TABLE IF NOT EXISTS "StartTimeConfig" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "mondaySort" TEXT NOT NULL DEFAULT '06:00',
    "tueFriSort" TEXT NOT NULL DEFAULT '06:45',
    "saturdaySort" TEXT NOT NULL DEFAULT '07:30',
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
    CONSTRAINT "StartTimeConfig_pkey" PRIMARY KEY ("id")
);

-- Seed default row
INSERT INTO "StartTimeConfig" ("id", "mondaySort", "tueFriSort", "saturdaySort", "updatedAt")
VALUES (1, '06:00', '06:45', '07:30', NOW())
ON CONFLICT ("id") DO NOTHING;
