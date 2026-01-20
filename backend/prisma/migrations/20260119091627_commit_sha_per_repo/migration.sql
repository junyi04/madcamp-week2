/*
  Warnings:

  - A unique constraint covering the columns `[repoId,sha]` on the table `Commit` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[repoId,userId]` on the table `Repository` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Commit_sha_key";

-- DropIndex
DROP INDEX "Repository_repoId_key";

-- CreateIndex
CREATE UNIQUE INDEX "Commit_repoId_sha_key" ON "Commit"("repoId", "sha");

-- CreateIndex
CREATE UNIQUE INDEX "Repository_repoId_userId_key" ON "Repository"("repoId", "userId");
