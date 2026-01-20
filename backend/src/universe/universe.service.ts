import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { StarType } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';


type GalaxySummary = {
  repoId: number,
  name: string,
  commitCount: number
}

type StarObject = {
  id: number;
  type: StarType;
  x: number;
  y: number;
  z: number;
  size: number;
  color: string;
  commit?: {
    id: number;
    sha: string;
    message: string;
    date: string;
    type: string;
  } | null;
  pullRequest?: {
    id: string;
    title?: string | null;
    url?: string | null;
  } | null;
};

@Injectable()
export class UniverseService {
  constructor(private readonly prisma: PrismaService) {}

  async getMySummary(userId: number, range?: string, types?: string) {
    const githubUserId = await this.getGithubUserId(userId);

    const repositories = await this.prisma.repository.findMany({
      where: { userId: githubUserId },
      select: { id: true, name: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
    });

    const repoIds = repositories.map((repo) => repo.id);
    const { commitCountByRepo, totalCommits } =
      await this.getCommitCountsByRepo(repoIds, range);

    const galaxies: GalaxySummary[] = repositories.map((repo) => ({
      repoId: repo.id,
      name: repo.name,
      commitCount: commitCountByRepo.get(repo.id) ?? 0,
    }));

    const lastSyncedAt = repositories[0]?.updatedAt ?? null;
    const includeCommits = this.parseTypes(types).includes('commit');

    return {
      galaxies,
      counts: {
        commits: includeCommits ? totalCommits : 0,
        prs: 0,
      },
      lastSyncedAt,
    };
  }

  async getMyGalaxy(
    userId: number,
    repoId: number,
    from?: string,
    to?: string,
    types?: string,
  ) {
    const githubUserId = await this.getGithubUserId(userId);

    const repository =
      (await this.prisma.repository.findUnique({
        where: { id: repoId },
      })) ||
      (await this.prisma.repository.findFirst({
        where: { repoId: BigInt(repoId), userId: githubUserId },
      }));

    if (!repository || repository.userId !== githubUserId) {
      throw new NotFoundException('Repository not found.');
    }

    const starTypes = this.parseStarTypes(types);
    const commitDateFilter = this.buildCommitDateRangeFilter(from, to);

    const stars = await this.prisma.star.findMany({
      where: {
        repoId: repository.id,
        type: { in: starTypes },
        ...(commitDateFilter
          ? {
              commit: {
                date: commitDateFilter,
              },
            }
          : {}),
      },
      include: {
        commit: {
          select: { id: true, sha: true, message: true, date: true },
        },
      },
      orderBy: { id: 'desc' },
    });

    const commitCount = stars.filter((star) => star.type === StarType.COMMIT)
      .length;
    const prCount = stars.filter((star) => star.type === StarType.PR).length;

    const celestialObjects: StarObject[] = stars.map((star) => ({
      id: star.id,
      type: star.type,
      x: star.x,
      y: star.y,
      z: star.z,
      size: star.size,
      color: star.color,
      commit: star.commit
        ? {
            ...star.commit,
            type: this.getCommitType(star.commit.message),
          }
        : null,
      pullRequest: star.pullRequestId
        ? {
            id: star.pullRequestId.toString(),
            title: star.pullRequestTitle,
            url: star.pullRequestUrl,
          }
        : null,
    }));

    return {
      repoId: repository.id,
      name: repository.name,
      celestialObjects,
      counts: {
        commits: commitCount,
        prs: prCount,
      },
    };
  }

  async getUserSummary(
    viewerId: number,
    targetUserId: number,
    range?: string,
    types?: string,
  ) {
    await this.assertFriendship(viewerId, targetUserId);

    return this.getMySummary(targetUserId, range, types);
  }

  async getUserGalaxy(
    viewerId: number,
    targetUserId: number,
    repoId: number,
    from?: string,
    to?: string,
    types?: string,
  ) {
    await this.assertFriendship(viewerId, targetUserId);

    return this.getMyGalaxy(targetUserId, repoId, from, to, types);
  }

  private parseTypes(types?: string): string[] {
    if (!types) {
      return ['commit'];
    }

    return types
      .split(',')
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean);
  }

  private parseStarTypes(types?: string): StarType[] {
    const parsed = this.parseTypes(types);
    const starTypes: StarType[] = [];

    if (parsed.includes('commit')) {
      starTypes.push(StarType.COMMIT);
    }

    if (parsed.includes('pr')) {
      starTypes.push(StarType.PR);
    }

    return starTypes.length ? starTypes : [StarType.COMMIT];
  }

  private async assertFriendship(viewerId: number, targetUserId: number) {
    if (viewerId === targetUserId) {
      return;
    }

    const friendship = await this.prisma.friendship.findFirst({
      where: {
        userId: viewerId,
        friendId: targetUserId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!friendship) {
      throw new ForbiddenException('Not friends.');
    }
  }

  private async getGithubUserId(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { githubUserId: true },
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    if (!user.githubUserId) {
      throw new NotFoundException('GitHub account not linked.');
    }

    return user.githubUserId;
  }

  private async getCommitCountsByRepo(
    repoIds: number[],
    range?: string,
  ) {
    if (!repoIds.length) {
      return { commitCountByRepo: new Map<number, number>(), totalCommits: 0 };
    }

    const dateFilter = this.buildCommitDateFilter(range);
    const grouped = await this.prisma.commit.groupBy({
      by: ['repoId'],
      where: {
        repoId: { in: repoIds },
        ...dateFilter,
      },
      _count: {
        _all: true,
      },
    });

    const commitCountByRepo = new Map<number, number>();
    let totalCommits = 0;

    for (const row of grouped) {
      commitCountByRepo.set(row.repoId, row._count._all);
      totalCommits += row._count._all;
    }

    return { commitCountByRepo, totalCommits };
  }

  private buildCommitDateFilter(range?: string) {
    if (!range) {
      return {};
    }

    const days = Number(range.replace('d', ''));
    if (Number.isNaN(days)) {
      return {};
    }

    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);

    return {
      date: {
        gte: fromDate.toISOString(),
      },
    };
  }

  private buildCommitDateRangeFilter(from?: string, to?: string) {
    const filter: { gte?: string; lte?: string } = {};

    if (from) {
      const fromDate = new Date(from);
      if (!Number.isNaN(fromDate.getTime())) {
        filter.gte = fromDate.toISOString();
      }
    }

    if (to) {
      const toDate = new Date(to);
      if (!Number.isNaN(toDate.getTime())) {
        filter.lte = toDate.toISOString();
      }
    }

    return Object.keys(filter).length ? filter : undefined;
  }

  private getCommitType(message: string) {
    const normalized = message.trim().toLowerCase();
    if (normalized.startsWith("feat")) {
      return "feat";
    }
    if (normalized.startsWith("fix")) {
      return "fix";
    }
    if (normalized.startsWith("docs")) {
      return "docs";
    }
    return "other";
  }
}
