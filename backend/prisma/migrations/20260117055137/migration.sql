-- CreateEnum
CREATE TYPE "StarType" AS ENUM ('COMMIT', 'PR');

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
    "commitId" INTEGER NOT NULL,

    CONSTRAINT "Star_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Star_repoId_idx" ON "Star"("repoId");

-- CreateIndex
CREATE INDEX "Star_commitId_idx" ON "Star"("commitId");

-- AddForeignKey
ALTER TABLE "Star" ADD CONSTRAINT "Star_repoId_fkey" FOREIGN KEY ("repoId") REFERENCES "Repository"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Star" ADD CONSTRAINT "Star_commitId_fkey" FOREIGN KEY ("commitId") REFERENCES "Commit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
