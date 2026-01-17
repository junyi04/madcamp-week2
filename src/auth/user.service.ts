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
  name: string;
  description: string;
  location: string;
  accessToken: string;
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

@Injectable()
export default class UserService {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

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

    const { data } = await this.githubGet("https://api.github.com/user", access_token);

    const { login, avatar_url, name, bio, company, public_repos, followers } =
      data;

    const githubInfoBase = {
      githubId: login,
      avatar: avatar_url,
      name,
      description: bio,
      location: company,
      accessToken: access_token,
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

  public async getRepos(accessToken: string): Promise<IGithubRepo[]> {
    const url = "https://api.github.com/user/repos?sort=updated&per_page=100";
    const { data } = await this.githubGet(url, accessToken);

    if (!Array.isArray(data) || data.length === 0) {
      return [];
    }

    const userResponse = await this.githubGet("https://api.github.com/user", accessToken);

    const githubLogin = userResponse.data.login;
    const githubUser = await this.prisma.githubUser.findUnique({
      where: { githubId: githubLogin },
    });

    if (!githubUser) {
      throw new UnauthorizedException("User info not registered.");
    }

    const activeRepos = data.filter(
      (repo: any) => !repo.archived && !repo.disabled,
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
        },
        create: {
          repoId: BigInt(repo.id),
          name: repo.name,
          updatedAt: repo.updated_at,
          userId: githubUser.id,
          galaxyX: coords.galaxyX,
          galaxyY: coords.galaxyY,
          galaxyZ: coords.galaxyZ,
          galaxySize: coords.galaxySize,
          createdAt: new Date(repo.created_at),
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

  // 최신 레포는 바깥쪽, 오래된 레포는 안쪽에 위치
  private buildGalaxyCoords(repos: Array<{ id: number; created_at: string }>) {
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

  private hash01(value: number) {
    const raw = Math.sin(value) * 10000;
    return raw - Math.floor(raw);
  }

  // 최신 커밋 30개 가져오고 Star 생성
  public async getCommits(
    accessToken: string,
    owner: string,
    repo: string,
  ): Promise<IcommitStar[]> {
    const url = `https://api.github.com/repos/${owner}/${repo}/commits?per_page=30`;

    const { data } = await this.githubGet(url, accessToken);

    const ownerUser = await this.prisma.githubUser.findUnique({
      where: { githubId: owner },
    });

    if (!ownerUser) {
      throw new UnauthorizedException("Owner is not registered.");
    }

    const repository = await this.prisma.repository.findFirst({
      where: {
        name: repo,
        userId: ownerUser.id,
      },
    });

    if (!repository) {
      throw new UnauthorizedException("Repository not found.");
    }

    if (!Array.isArray(data) || data.length === 0) {
      await this.syncPullRequestStars(
        accessToken,
        owner,
        repo,
        repository,
      );
      await this.prisma.repository.update({
        where: { id: repository.id },
        data: { lastSyncedAt: new Date() },
      });
      return [];
    }

    const commitDates = data.map(
      (item: any) => new Date(item.commit.author.date),
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
      await this.upsertCommitStar(repository, commit.id, item.sha, ageRatio);
    }

    await this.syncPullRequestStars(accessToken, owner, repo, repository);

    await this.prisma.repository.update({
      where: { id: repository.id },
      data: { lastSyncedAt: new Date() },
    });

    return data.map((item: any) => ({
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
    const { data } = await this.githubGet(url, accessToken);

    if (!data || data.length === 0) {
      return;
    }

    const prDates = data.map((pr: any) => new Date(pr.created_at));
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
          color: "#FFD166",
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
        color: "#FFD166",
        repoId: repository.id,
        commitId,
      },
    });
  }

  private async upsertPullRequestStar(
    repository: { id: number; galaxyX: number; galaxyY: number; galaxyZ: number },
    pr: any,
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

  private getDateRange(dates: Date[]) {
    if (!dates.length) {
      const now = new Date();
      return { minDate: now, maxDate: now };
    }

    const sorted = [...dates].sort((a, b) => a.getTime() - b.getTime());
    return { minDate: sorted[0], maxDate: sorted[sorted.length - 1] };
  }

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

  private async githubGet<T>(url: string, accessToken: string) {
    try {
      return await axios.get<T>(url, {
        headers: { Authorization: `token ${accessToken}` },
      });
    } catch (error) {
      if (!axios.isAxiosError(error)) {
        throw error;
      }
      const status = error.response?.status;
      const remaining = error.response?.headers?.["x-ratelimit-remaining"];

      if (status === 401) {
        throw new UnauthorizedException("GitHub token is invalid.");
      }

      if (status === 403) {
        if (remaining === "0") {
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
