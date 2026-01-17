/*
  Warnings:

  - You are about to drop the column `lastSyncAt` on the `Repository` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Repository" DROP COLUMN "lastSyncAt";
