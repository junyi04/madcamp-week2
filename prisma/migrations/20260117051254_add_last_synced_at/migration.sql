/*
  Warnings:

  - Added the required column `lastSyncAt` to the `Repository` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Repository" ADD COLUMN     "lastSyncAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "lastSyncedAt" TIMESTAMP(3);
