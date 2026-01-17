/*
  Warnings:

  - Added the required column `galaxySize` to the `Repository` table without a default value. This is not possible if the table is not empty.
  - Added the required column `galaxyX` to the `Repository` table without a default value. This is not possible if the table is not empty.
  - Added the required column `galaxyY` to the `Repository` table without a default value. This is not possible if the table is not empty.
  - Added the required column `galaxyZ` to the `Repository` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "StarType" AS ENUM ('COMMIT', 'PR');

-- AlterTable
ALTER TABLE "Repository" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "galaxySize" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "galaxyX" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "galaxyY" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "galaxyZ" DOUBLE PRECISION NOT NULL;

-- CreateTable
CREATE TABLE "Star" (
    "id" SERIAL NOT NULL,
    "type" "StarType" NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "z" DOUBLE PRECISION NOT NULL,
    "size" DOUBLE PRECISION NOT NULL,
    "color" TEXT NOT NULL,
    "repoId" INTEGER NOT NULL,
    "commitId" INTEGER,
    "pullRequestId" INTEGER,
    "pullRequestTitle" TEXT,
    "pullRequestUrl" TEXT,

    CONSTRAINT "Star_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Star_repoId_idx" ON "Star"("repoId");

-- CreateIndex
CREATE INDEX "Star_commitId_idx" ON "Star"("commitId");

-- CreateIndex
CREATE INDEX "Star_pullRequestId_idx" ON "Star"("pullRequestId");

-- AddForeignKey
ALTER TABLE "Star" ADD CONSTRAINT "Star_repoId_fkey" FOREIGN KEY ("repoId") REFERENCES "Repository"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Star" ADD CONSTRAINT "Star_commitId_fkey" FOREIGN KEY ("commitId") REFERENCES "Commit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
