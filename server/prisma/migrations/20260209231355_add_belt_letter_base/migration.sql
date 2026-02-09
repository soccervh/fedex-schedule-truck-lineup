/*
  Warnings:

  - Added the required column `baseNumber` to the `Belt` table without a default value. This is not possible if the table is not empty.
  - Added the required column `letter` to the `Belt` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Belt" ADD COLUMN     "baseNumber" INTEGER NOT NULL,
ADD COLUMN     "letter" TEXT NOT NULL;
