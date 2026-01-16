-- CreateTable
CREATE TABLE "GithubUser" (
    "id" SERIAL NOT NULL,
    "githubId" TEXT NOT NULL,
    "avatar" TEXT,
    "name" TEXT,
    "accessToken" TEXT NOT NULL,
    "publicRepos" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GithubUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Repository" (
    "id" SERIAL NOT NULL,
    "repoId" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "updatedAt" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "Repository_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Commit" (
    "id" SERIAL NOT NULL,
    "sha" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "repoId" INTEGER NOT NULL,

    CONSTRAINT "Commit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GithubUser_githubId_key" ON "GithubUser"("githubId");

-- CreateIndex
CREATE UNIQUE INDEX "Repository_repoId_key" ON "Repository"("repoId");

-- CreateIndex
CREATE UNIQUE INDEX "Commit_sha_key" ON "Commit"("sha");

-- AddForeignKey
ALTER TABLE "Repository" ADD CONSTRAINT "Repository_userId_fkey" FOREIGN KEY ("userId") REFERENCES "GithubUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commit" ADD CONSTRAINT "Commit_repoId_fkey" FOREIGN KEY ("repoId") REFERENCES "Repository"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
