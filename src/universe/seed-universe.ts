import { PrismaClient, StarType } from "@prisma/client";

const prisma = new PrismaClient();

const run = async () => {
  if (process.env.NODE_ENV !== "development") {
    console.error("seed-universe is only available in development.");
    process.exit(1);
  }

  const githubUser = await prisma.githubUser.create({
    data: {
      githubId: "seed-user",
      avatar: "https://example.com/avatar.png",
      name: "Seed User",
      accessToken: "seed-token",
      publicRepos: 2,
    },
  });

  const now = new Date();
  const repoA = await prisma.repository.create({
    data: {
      repoId: BigInt(1001),
      name: "seed-repo-a",
      updatedAt: now.toISOString(),
      createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 200),
      userId: githubUser.id,
      galaxyX: 0.45,
      galaxyY: 0.52,
      galaxyZ: 0.05,
      galaxySize: 2.5,
    },
  });

  const repoB = await prisma.repository.create({
    data: {
      repoId: BigInt(1002),
      name: "seed-repo-b",
      updatedAt: now.toISOString(),
      createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 50),
      userId: githubUser.id,
      galaxyX: 0.62,
      galaxyY: 0.38,
      galaxyZ: 0.1,
      galaxySize: 2.1,
    },
  });

  const commitDates = [
    new Date(now.getTime() - 1000 * 60 * 60 * 24 * 2),
    new Date(now.getTime() - 1000 * 60 * 60 * 24 * 5),
    new Date(now.getTime() - 1000 * 60 * 60 * 24 * 10),
  ];

  const commitsA = await Promise.all(
    commitDates.map((date, index) =>
      prisma.commit.create({
        data: {
          sha: `seed-sha-a-${index}`,
          message: `Seed commit A ${index + 1}`,
          date: date.toISOString(),
          repoId: repoA.id,
        },
      }),
    ),
  );

  const commitsB = await Promise.all(
    commitDates.map((date, index) =>
      prisma.commit.create({
        data: {
          sha: `seed-sha-b-${index}`,
          message: `Seed commit B ${index + 1}`,
          date: date.toISOString(),
          repoId: repoB.id,
        },
      }),
    ),
  );

  const toStarData = (commit: { id: number }, idx: number, repoId: number) => ({
    type: StarType.COMMIT,
    x: (idx + 1) * 0.1,
    y: (idx + 1) * 0.2,
    z: (idx + 1) * 0.03,
    size: 3 + idx,
    color: "#FFD166",
    repoId,
    commitId: commit.id,
  });

  await prisma.star.createMany({
    data: commitsA.map((commit, idx) => toStarData(commit, idx, repoA.id)),
  });

  await prisma.star.createMany({
    data: commitsB.map((commit, idx) => toStarData(commit, idx, repoB.id)),
  });

  console.log("Seeded universe data", {
    githubUserId: githubUser.id,
    repoAId: repoA.id,
    repoBId: repoB.id,
  });
};

run()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
