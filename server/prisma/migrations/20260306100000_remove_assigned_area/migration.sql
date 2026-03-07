-- AlterTable: remove homeArea column from User
ALTER TABLE "User" DROP COLUMN "homeArea";

-- DropEnum
DROP TYPE "HomeArea";
