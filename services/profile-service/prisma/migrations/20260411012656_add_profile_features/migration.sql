/*
  Warnings:

  - Made the column `major` on table `Profile` required. This step will fail if there are existing NULL values in that column.
  - Made the column `academicYear` on table `Profile` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Profile" ALTER COLUMN "major" SET NOT NULL,
ALTER COLUMN "academicYear" SET NOT NULL;
