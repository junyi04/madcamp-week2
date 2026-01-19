import {
  ForbiddenException,
  HttpException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { GithubCodeDto } from "./dto/user.dto";
import { ConfigService } from "@nestjs/config";
import axios, { AxiosResponse } from "axios";
import { PrismaService } from "src/prisma/prisma.service";
import { JwtService } from "@nestjs/jwt";
import { StarType } from "@prisma/client";

export interface IGithubUserTypes {
  githubId: string;
  avatar: string;
  name: string | null;
  description: string | null;
  location: string | null;
  totalStats: number;
  publicRepos: number;
  userId: number;
  appToken: string;
}

export interface IGithubRepo {
  name: string;
  id: number;
  updated_at: string;
}

export interface IcommitStar {
  sha: string;
  message: string;
  date: string;
}

type GithubUserResponse = {
  login: string;
  avatar_url: string;
  name: string | null;
  bio: string | null;
  company: string | null;
  public_repos: number;
  followers: number;
};

type GithubRepoResponse = {
  id: number;
  name: string;
  updated_at: string;
  created_at: string;
  owner: { login: string };
  archived: boolean;
  disabled: boolean;
};

type GithubCommitResponse = {
  sha: string;
  commit: {
    message: string;
    author: {
      date: string;
    };
  };
};

type GithubRepoInfoResponse = {
  id: number;
};

type GithubPullRequestResponse = {
  id: number;
  created_at: string;
  title?: string | null;
  html_url?: string | null;
};

@Injectable()
export default class UserService {
  private readonly githubCache = new Map<string, { data: unknown; expiresAt: number }>();
  private readonly githubCooldownUntil = new Map<string, number>();

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  // Github OAuth 통해 access Token 교환 + 유저 정보 조회
  public async getGithubInfo(
    githubCodeDto: GithubCodeDto,
  ): Promise<IGithubUserTypes> {
    const { code } = githubCodeDto;

    const clientId = this.configService.get<string>("GITHUB_CLIENT_ID");
    const clientSecret = this.configService.get<string>("GITHUB_CLIENT_SECRET");

    const getTokenUrl = "https://github.com/login/oauth/access_token";
    const request = {
      code,
      client_id: clientId,
      client_secret: clientSecret,
    };

    const response: AxiosResponse = await axios.post(getTokenUrl, request, {
      headers: { accept: "application/json" },
    });

    if (response.data.error) {
      throw new UnauthorizedException(401, "GitHub authentication failed.");
    }

    const { access_token } = response.data;

    const { data } = await this.githubGet<GithubUserResponse>(
      "https://api.github.com/user",
      access_token,
    );

    const { login, avatar_url, name, bio, company, public_repos, followers } =
      data;

    const githubInfoBase = {
      githubId: login,
      avatar: avatar_url,
      name,
      description: bio,
      location: company,
      publicRepos: public_repos,
      totalStats: followers,
    };

    const githubUser = await this.prisma.githubUser.upsert({
      where: { githubId: login },
      update: {
        accessToken: access_token,
        avatar: avatar_url,
        publicRepos: public_repos,
      },
      create: {
        githubId: login,
        avatar: avatar_url,
        name: name || login,
        accessToken: access_token,
        publicRepos: public_repos,
      },
    });

    let user = await this.prisma.user.findUnique({
      where: { githubUserId: githubUser.id },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          nickname: githubUser.name ?? githubUser.githubId,
          githubUserId: githubUser.id,
        },
      });
    }

    const payload = {
      userId: user.id,
      githubId: githubUser.githubId,
    };

    const appToken = this.jwtService.sign(payload);

    return {
      ...githubInfoBase,
      userId: user.id,
      appToken,
    };
  }

  // 레포 목록 받음
  public async getReposForUser(userId: number): Promise<IGithubRepo[]> {
    const { accessToken, githubUserId } =
      await this.getGithubAuthForUser(userId);

    const url = "https://api.github.com/user/repos?sort=updated&per_page=100";
    const { data } = await this.githubGet<GithubRepoResponse[]>(url, accessToken);

    if (!Array.isArray(data) || data.length === 0) {
      return [];
    }

    const activeRepos = data.filter(
      (repo) => !repo.archived && !repo.disabled,
    );
    const repoCoords = this.buildGalaxyCoords(activeRepos);

    for (const repo of activeRepos) {
      const coords = repoCoords.get(repo.id);
      if (!coords) continue;

      await this.prisma.repository.upsert({
        where: { repoId: BigInt(repo.id) },
        update: {
          name: repo.name,
          updatedAt: repo.updated_at,
          galaxyX: coords.galaxyX,
          galaxyY: coords.galaxyY,
          galaxyZ: coords.galaxyZ,
          galaxySize: coords.galaxySize,
          createdAt: new Date(repo.created_at),
          ownerName: repo.owner.login,
        },
        create: {
          repoId: BigInt(repo.id),
          name: repo.name,
          updatedAt: repo.updated_at,
          userId: githubUserId,
          galaxyX: coords.galaxyX,
          galaxyY: coords.galaxyY,
          galaxyZ: coords.galaxyZ,
          galaxySize: coords.galaxySize,
          createdAt: new Date(repo.created_at),
          ownerName: repo.owner.login,
        },
      });
    }

    return data
      .filter((repo: any) => !repo.archived && !repo.disabled)
      .map((repo: any) => ({
        name: repo.name,
        id: repo.id,
        updated_at: repo.updated_at,
      }));
  }

  // 나선형 : 최신 레포는 바깥쪽, 오래된 레포는 안쪽에 위치
  private buildGalaxyCoords(
    repos: Array<{ id: number; created_at: string }>,
  ) {
    const coords = new Map<number, {
      galaxyX: number;
      galaxyY: number;
      galaxyZ: number;
      galaxySize: number;
    }>();

    if (!repos.length) {
      return coords;
    }

    const sorted = [...repos].sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );

    const minDate = new Date(sorted[0].created_at);
    const maxDate = new Date(sorted[sorted.length - 1].created_at);
    const dateRange =
      maxDate.getTime() - minDate.getTime() || 1;

    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    sorted.forEach((repo, index) => {
      const createdAt = new Date(repo.created_at);
      const ageRatio =
        (createdAt.getTime() - minDate.getTime()) / dateRange;
      const radius = 0.05 + ageRatio * 0.45;
      const angle = index * goldenAngle;
      const galaxyX = 0.5 + radius * Math.cos(angle);
      const galaxyY = 0.5 + radius * Math.sin(angle);
      const galaxyZ = this.hash01(repo.id * 0.0001 + 7) * 0.2;
      const galaxySize = 2 + (1 - ageRatio) * 1.5;

      coords.set(repo.id, { galaxyX, galaxyY, galaxyZ, galaxySize });
    });

    return coords;
  }

  // 난수 0~1 생성
  private hash01(value: number) {
    const raw = Math.sin(value) * 10000;
    return raw - Math.floor(raw);
  }

  // 최신 커밋 30개 가져오고 Star 생성
  public async getCommitsForUser(
    userId: number,
    repoId: number,
    forceSync = false,
  ): Promise<IcommitStar[]> {
    const { accessToken, githubUserId } = await this.getGithubAuthForUser(userId);
    const repository = await this.prisma.repository.findFirst({
      where: {
        id: repoId,
        userId: githubUserId,
      },
      select: {
        id: true,
        name: true,
        ownerName: true,
        repoId: true,
        lastSyncedAt: true,
        galaxyX: true,
        galaxyY: true,
        galaxyZ: true,
      },
    });

    if (!repository) {
      throw new NotFoundException("Repository not found.");
    }

    if (!forceSync && repository.lastSyncedAt) {
      const cachedCommits = await this.prisma.commit.findMany({
        where: { repoId: repository.id },
        orderBy: { date: "desc" },
        take: 30,
      });
      return cachedCommits.map((item) => ({
        sha: item.sha,
        message: item.message,
        date: item.date,
      }));
    }

    const url = `https://api.github.com/repos/${repository.ownerName}/${repository.name}/commits?per_page=30`;

    const { data } = await this.githubGet<GithubCommitResponse[]>(url, accessToken);

    if (!Array.isArray(data) || data.length === 0) {
      await this.syncPullRequestStars(
        accessToken,
        repository.ownerName,
        repository.name,
        repository,
      );
      await this.prisma.repository.update({
        where: { id: repository.id },
        data: { lastSyncedAt: new Date() },
      });
      return [];
    }

    const commitDates = data.map(
      (item) => new Date(item.commit.author.date),
    );
    const { minDate, maxDate } = this.getDateRange(commitDates);

    for (const item of data) {
      const commit = await this.prisma.commit.upsert({
        where: { sha: item.sha },
        update: {
          message: item.commit.message,
          date: item.commit.author.date,
        },
        create: {
          sha: item.sha,
          message: item.commit.message,
          date: item.commit.author.date,
          repoId: repository.id,
        },
      });
      const ageRatio = this.getAgeRatio(
        new Date(item.commit.author.date),
        minDate,
        maxDate,
      );
      await this.upsertCommitStar(
        repository,
        commit.id,
        item.sha,
        ageRatio,
      );
    }

    await this.syncPullRequestStars(
      accessToken,
      repository.ownerName,
      repository.name,
      repository,
    );

    await this.prisma.repository.update({
      where: { id: repository.id },
      data: { lastSyncedAt: new Date() },
    });

    return data.map((item) => ({
      sha: item.sha,
      message: item.commit.message,
      date: item.commit.author.date,
    }));
  }

  public async searchAppUsers(query: string) {
    return this.prisma.user.findMany({
      where: {
        githubUser: {
          githubId: {
            contains: query,
            mode: "insensitive",
          },
        },
      },
      select: {
        id: true,
        nickname: true,
        githubUser: {
          select: {
            githubId: true,
            avatar: true,
          },
        },
      },
      take: 10,
    });
  }

  // PR 1개를 Star로 만들거나 갱신
  private async syncPullRequestStars(
    accessToken: string,
    owner: string,
    repo: string,
    repository: {
      id: number;
      galaxyX: number;  
      galaxyY: number;  
      galaxyZ: number;
    },
  ) {
    const url = `https://api.github.com/repos/${owner}/${repo}/pulls?state=all&per_page=30`;
    const { data } = await this.githubGet<GithubPullRequestResponse[]>(
      url,
      accessToken,
    );

    if (!Array.isArray(data) || data.length === 0) {
      return;
    }

    const prDates = data.map((pr) => new Date(pr.created_at));
    const { minDate, maxDate } = this.getDateRange(prDates);

    for (const pr of data) {
      const ageRatio = this.getAgeRatio(
        new Date(pr.created_at),
        minDate,
        maxDate,
      );
      await this.upsertPullRequestStar(repository, pr, ageRatio);
    }
  }

  // Commit 1개를 Star로 만들거나 갱신
  private async upsertCommitStar(
    repository: { id: number; galaxyX: number; galaxyY: number; galaxyZ: number },
    commitId: number,
    sha: string,
    ageRatio: number,
  ) {
    const coords = this.toSpiralArmCoords(
      repository.galaxyX,
      repository.galaxyY,
      ageRatio,
      this.hashStringToNumber(sha),
      3,
      0.2,
    );

    const existing = await this.prisma.star.findFirst({
      where: {
        repoId: repository.id,
        commitId,
        type: StarType.COMMIT,
      },
      select: { id: true },
    });

    if (existing) {
      await this.prisma.star.update({
        where: { id: existing.id },
        data: {
          x: coords.x,
          y: coords.y,
          z: coords.z,
          size: 3,
          color: "#FFFFFF",
        },
      });
      return;
    }

    await this.prisma.star.create({
      data: {
        type: StarType.COMMIT,
        x: coords.x,
        y: coords.y,
        z: coords.z,
        size: 3,
        color: "#FFFFFF",
        repoId: repository.id,
        commitId,
      },
    });
  }

  private async upsertPullRequestStar(
    repository: { id: number; galaxyX: number; galaxyY: number; galaxyZ: number },
    pr: GithubPullRequestResponse,
    ageRatio: number,
  ) {
    const coords = this.toSpiralArmCoords(
      repository.galaxyX,
      repository.galaxyY,
      ageRatio,
      Number(pr.id),
      4,
      0.25,
    );

    const existing = await this.prisma.star.findFirst({
      where: {
        repoId: repository.id,
    pullRequestId: BigInt(pr.id),
        type: StarType.PR,
      },
      select: { id: true },
    });

    if (existing) {
      await this.prisma.star.update({
        where: { id: existing.id },
        data: {
          x: coords.x,
          y: coords.y,
          z: coords.z,
          size: 5,
          color: "#8ECAE6",
          pullRequestTitle: pr.title ?? null,
          pullRequestUrl: pr.html_url ?? null,
        },
      });
      return;
    }

    await this.prisma.star.create({
      data: {
        type: StarType.PR,
        x: coords.x,
        y: coords.y,
        z: coords.z,
        size: 5,
        color: "#8ECAE6",
        repoId: repository.id,
        pullRequestId: BigInt(pr.id),
    pullRequestTitle: pr.title ?? null,
    pullRequestUrl: pr.html_url ?? null,
      },
    });
  }

  // 나선팔 좌표 생성 로직
  private toSpiralArmCoords(
    centerX: number,
    centerY: number,
    ageRatio: number,
    seed: number,
    arms: number,
    radiusScale: number,
  ) {
    const armIndex = Math.floor(this.hash01(seed + 0.1) * arms);
    const angle =
      ageRatio * Math.PI * 4 +
      armIndex * ((2 * Math.PI) / arms) +
      this.hash01(seed + 0.2) * 0.4;
    const radius = 0.02 + ageRatio * radiusScale;
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;
    const z = this.hash01(seed + 0.3) * 0.1;
    return { x, y, z };
  }


  // 날짜 배열 최소, 최대 계산
  private getDateRange(dates: Date[]) {
    if (!dates.length) {
      const now = new Date();
      return { minDate: now, maxDate: now };
    }

    const sorted = [...dates].sort((a, b) => a.getTime() - b.getTime());
    return { minDate: sorted[0], maxDate: sorted[sorted.length - 1] };
  }

  // 날짜를 0~1 비율로 변환
  private getAgeRatio(date: Date, minDate: Date, maxDate: Date) {
    const range = maxDate.getTime() - minDate.getTime();
    if (range <= 0) {
      return 0;
    }
    return (date.getTime() - minDate.getTime()) / range;
  }

  private hashStringToNumber(value: string) {
    let hash = 0;
    for (let i = 0; i < value.length; i += 1) {
      hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
    }
    return hash;
  }

  private async getGithubAuthForUser(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { githubUser: true },
    });

    if (!user?.githubUser?.accessToken) {
      throw new UnauthorizedException("User info not registered.");
    }

    return {
      accessToken: user.githubUser.accessToken,
      githubUserId: user.githubUser.id,
    };
  }


  // Github API 호출 함수 (rate limit, 권한, 미존재 예외 처리)
  private async githubGet<T>(url: string, accessToken: string): Promise<AxiosResponse<T>> {
    const now = Date.now();
    const cooldownUntil = this.githubCooldownUntil.get(accessToken);
    if (cooldownUntil && now < cooldownUntil) {
      throw new HttpException("GitHub rate limit exceeded.", 429);
    }

    const cacheKey = `${accessToken}:${url}`;
    const cached = this.githubCache.get(cacheKey);
    if (cached && cached.expiresAt <= now) {
      this.githubCache.delete(cacheKey);
    }
    if (cached && cached.expiresAt > now) {
      return { data: cached.data as T } as AxiosResponse<T>;
    }
    

    try {
      const response = await axios.get<T>(url, {
        headers: { Authorization: `token ${accessToken}` },
      });
      const ttl = url.includes("/user/repos") ? 60_000 : url.includes("/user") ? 30_000 : 0;
      if (ttl > 0) {
        this.githubCache.set(cacheKey, { data: response.data, expiresAt: now + ttl });
      }
      return response;
    } catch (error) {
      if (!axios.isAxiosError(error)) {
        throw error;
      }
      const status = error.response?.status;
      const remaining = error.response?.headers?.["x-ratelimit-remaining"];
      const reset = error.response?.headers?.["x-ratelimit-reset"];

      if (status === 401) {
        throw new UnauthorizedException("GitHub token is invalid.");
      }

      if (status === 403 || status === 429) {
        if (remaining === "0") {
          const resetAt = reset ? Number(reset) * 1000 : now + 60_000;
          this.githubCooldownUntil.set(accessToken, resetAt);
          throw new HttpException("GitHub rate limit exceeded.", 429);
        }
        throw new ForbiddenException("GitHub access denied. Check scopes.");
      }

      if (status === 404) {
        throw new NotFoundException("GitHub resource not found or private.");
      }

      throw new HttpException("GitHub API error.", status ?? 502);
    }
  }
}
