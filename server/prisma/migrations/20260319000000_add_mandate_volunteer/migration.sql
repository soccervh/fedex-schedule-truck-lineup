-- Create Mandate table
CREATE TABLE IF NOT EXISTS "Mandate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "createdBy" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Mandate_pkey" PRIMARY KEY ("id")
);

-- Create Volunteer table
CREATE TABLE IF NOT EXISTS "Volunteer" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "shift" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Volunteer_pkey" PRIMARY KEY ("id")
);

-- Add unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS "Mandate_userId_date_key" ON "Mandate"("userId", "date");
CREATE UNIQUE INDEX IF NOT EXISTS "Volunteer_userId_date_key" ON "Volunteer"("userId", "date");

-- Add foreign keys
ALTER TABLE "Mandate" ADD CONSTRAINT "Mandate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Mandate" ADD CONSTRAINT "Mandate_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Volunteer" ADD CONSTRAINT "Volunteer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
