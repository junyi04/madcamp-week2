import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const run = async () => {
  const githubUser = await prisma.githubUser.create({
    data: {
      githubId: 'seed-user',
      avatar: 'https://example.com/avatar.png',
      name: 'Seed User',
      accessToken: 'seed-token',
      publicRepos: 2,
    },
  });

  const repoA = await prisma.repository.create({
    data: {
      repoId: BigInt(1001),
      name: 'seed-repo-a',
      updatedAt: new Date().toISOString(),
      userId: githubUser.id,
    },
  });

  const repoB = await prisma.repository.create({
    data: {
      repoId: BigInt(1002),
      name: 'seed-repo-b',
      updatedAt: new Date().toISOString(),
      userId: githubUser.id,
    },
  });

  const now = new Date();
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

  const toStarData = (commit: { id: number }, idx: number) => ({
    type: 'COMMIT' as const,
    x: (idx + 1) * 0.1,
    y: (idx + 1) * 0.2,
    z: (idx + 1) * 0.3,
    size: 3 + idx,
    color: '#FFD166',
    repoId: repoA.id,
    commitId: commit.id,
  });

  await prisma.star.createMany({
    data: commitsA.map((commit, idx) => toStarData(commit, idx)),
  });

  await prisma.star.createMany({
    data: commitsB.map((commit, idx) => ({
      type: 'COMMIT' as const,
      x: (idx + 1) * 0.15,
      y: (idx + 1) * 0.25,
      z: (idx + 1) * 0.35,
      size: 3 + idx,
      color: '#06D6A0',
      repoId: repoB.id,
      commitId: commit.id,
    })),
  });

  console.log('Seeded universe data', {
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