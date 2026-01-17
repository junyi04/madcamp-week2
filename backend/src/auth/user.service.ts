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

type ConstellationPoint = { x: number; y: number };
type ConstellationTemplate = {
  name: string;
  points: ConstellationPoint[];
};

const ZODIAC_TEMPLATES: ConstellationTemplate[] = [
  { name: "aries", points: [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 0.5 }] },
  { name: "taurus", points: [{ x: 0, y: 1 }, { x: 1, y: 2 }, { x: 2, y: 1.6 }, { x: 3, y: 1.2 }, { x: 4, y: 1.4 }, { x: 5, y: 2.1 }, { x: 6, y: 1.5 }] },
  { name: "gemini", points: [{ x: 0, y: 0 }, { x: 0, y: 2 }, { x: 0, y: 4 }, { x: 2, y: 0 }, { x: 2, y: 2 }, { x: 2, y: 4 }] },
  { name: "cancer", points: [{ x: 0, y: 0.3 }, { x: 1.5, y: 1.2 }, { x: 3, y: 0.4 }] },
  { name: "leo", points: [{ x: 0, y: 1 }, { x: 1, y: 2 }, { x: 2, y: 2.2 }, { x: 3, y: 1.8 }, { x: 4, y: 1.2 }, { x: 5, y: 1 }, { x: 6, y: 1.4 }, { x: 5, y: 2.6 }, { x: 4, y: 3.1 }] },
  { name: "virgo", points: [{ x: 0, y: 0.2 }, { x: 1, y: 1 }, { x: 2, y: 0.6 }, { x: 3, y: 1.5 }, { x: 4, y: 1.1 }, { x: 5, y: 2 }, { x: 6, y: 1.6 }, { x: 7, y: 2.5 }] },
  { name: "libra", points: [{ x: 0, y: 0.2 }, { x: 1, y: 0.6 }, { x: 2, y: 0.2 }] },
  { name: "scorpio", points: [{ x: 0, y: 0.5 }, { x: 1, y: 0.8 }, { x: 2, y: 1 }, { x: 3, y: 1.2 }, { x: 4, y: 1.4 }, { x: 5, y: 1.6 }, { x: 6, y: 1.9 }, { x: 7, y: 2.2 }, { x: 6.5, y: 2.6 }, { x: 5.5, y: 2.8 }, { x: 4.5, y: 2.6 }, { x: 3.5, y: 2.4 }, { x: 2.5, y: 2.2 }, { x: 1.5, y: 2.0 }] },
  { name: "sagittarius", points: [{ x: 0, y: 1 }, { x: 1, y: 2 }, { x: 2, y: 1.6 }, { x: 3, y: 2.2 }, { x: 4, y: 1.8 }, { x: 3.2, y: 1 }, { x: 2.2, y: 0.6 }, { x: 1.2, y: 0.8 }, { x: 0.8, y: 1.8 }, { x: 1.8, y: 2.8 }, { x: 2.8, y: 3.2 }] },
  { name: "capricorn", points: [{ x: 0, y: 1 }, { x: 1, y: 1.6 }, { x: 2, y: 2 }, { x: 3, y: 1.7 }, { x: 4, y: 1.2 }, { x: 5, y: 1.4 }, { x: 6, y: 1.1 }] },
  { name: "aquarius", points: [{ x: 0, y: 0.6 }, { x: 1, y: 1 }, { x: 2, y: 0.6 }] },
  { name: "pisces", points: [{ x: 0, y: 1 }, { x: 1, y: 0.6 }, { x: 2, y: 1 }] },
];

const mulberry32 = (seed: number) => {
  let t = seed >>> 0;
  return () => {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
};

const normalizePoints = (points: ConstellationPoint[]) => {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const point of points) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }

  const width = maxX - minX || 1;
  const height = maxY - minY || 1;

  return points.map((point) => ({
    x: (point.x - minX) / width - 0.5,
    y: (point.y - minY) / height - 0.5,
  }));
};

const rotatePoints = (points: ConstellationPoint[], angleRad: number) => {
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  return points.map((point) => ({
    x: point.x * cos - point.y * sin,
    y: point.x * sin + point.y * cos,
  }));
};

@Injectable()
export default class UserService {
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

  // 레포 목록 받음
  public async getRepos(accessToken: string): Promise<IGithubRepo[]> {
    const url = "https://api.github.com/user/repos?sort=updated&per_page=100";
    const { data } = await this.githubGet<GithubRepoResponse[]>(url, accessToken);

    if (!Array.isArray(data) || data.length === 0) {
      return [];
    }

    const userResponse = await this.githubGet<GithubUserResponse>(
      "https://api.github.com/user",
      accessToken,
    );

    const githubLogin = userResponse.data.login;
    const githubUser = await this.prisma.githubUser.findUnique({
      where: { githubId: githubLogin },
    });

    if (!githubUser) {
      throw new UnauthorizedException("User info not registered.");
    }

    const activeRepos = data.filter(
      (repo) => !repo.archived && !repo.disabled,
    );
    const repoCoords = this.buildGalaxyCoords(activeRepos, githubUser.id);

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

  // 나선형 : 최신 레포는 바깥쪽, 오래된 레포는 안쪽에 위치
  private buildGalaxyCoords(
    repos: Array<{ id: number; created_at: string }>,
    seedBase: number,
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

    const rng = mulberry32(seedBase || 1);
    const constellationRadius = 0.28 + rng() * 0.1;
    const constellationScaleBase = 0.16 + rng() * 0.06;

    const templateIndices = ZODIAC_TEMPLATES.map((_, index) => index);
    const shuffleTemplates = () => {
      for (let i = templateIndices.length - 1; i > 0; i -= 1) {
        const j = Math.floor(rng() * (i + 1));
        [templateIndices[i], templateIndices[j]] = [templateIndices[j], templateIndices[i]];
      }
    };
    shuffleTemplates();

    let repoIndex = 0;
    let constellationIndex = 0;
    let templateCursor = 0;
    while (repoIndex < sorted.length) {
      if (templateCursor >= templateIndices.length) {
        shuffleTemplates();
        templateCursor = 0;
      }

      const template = ZODIAC_TEMPLATES[templateIndices[templateCursor]];
      templateCursor += 1;

      const normalized = normalizePoints(template.points);
      const rotation = rng() * Math.PI * 2;
      const rotated = rotatePoints(normalized, rotation);
      const angle = (constellationIndex % 12) * (Math.PI * 2 / 12) + (rng() - 0.5) * 0.4;
      const centerX = 0.5 + Math.cos(angle) * constellationRadius + (rng() - 0.5) * 0.08;
      const centerY = 0.5 + Math.sin(angle) * constellationRadius + (rng() - 0.5) * 0.08;
      const constellationScale = constellationScaleBase * (0.85 + rng() * 0.3);

      for (let i = 0; i < rotated.length && repoIndex < sorted.length; i += 1) {
        const repo = sorted[repoIndex];
        const point = rotated[i];
        const galaxyX = Math.min(0.98, Math.max(0.02, centerX + point.x * constellationScale));
        const galaxyY = Math.min(0.98, Math.max(0.02, centerY + point.y * constellationScale));
        const galaxyZ = 0.02 + rng() * 0.08;
        const galaxySize = 2.2 + rng() * 0.6;

        coords.set(repo.id, { galaxyX, galaxyY, galaxyZ, galaxySize });
        repoIndex += 1;
      }

      constellationIndex += 1;
    }

    return coords;
  }

  // 난수 0~1 생성
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

    const { data } = await this.githubGet<GithubCommitResponse[]>(url, accessToken);

    const ownerUser = await this.prisma.githubUser.findUnique({
      where: { githubId: owner },
    });

    if (!ownerUser) {
      throw new UnauthorizedException("Owner is not registered.");
    }

    const repoInfo = await this.githubGet<GithubRepoInfoResponse>(
      `https://api.github.com/repos/${owner}/${repo}`,
      accessToken,
    );
    if (!repoInfo.data?.id) {
      throw new NotFoundException("Repository not found.");
    }

    const repository = await this.prisma.repository.findFirst({
      where: {
        repoId: BigInt(repoInfo.data.id),
        userId: ownerUser.id,
      },
    });

    if (!repository) {
      throw new NotFoundException("Repository not found.");
    }

    if (!Array.isArray(data) || data.length === 0) {
      await this.syncPullRequestStars(
        accessToken,
        owner,
        repo,
        repository,
      );
      // repoId로 DB에서 Repository 조회
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
        item.commit.message,
        ageRatio,
      );
    }

    await this.syncPullRequestStars(accessToken, owner, repo, repository);

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

  // 커밋 1개를 Star로 만들거나 갱신
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

  // PR 1개를 Star로 만들거나 갱신
  private async upsertCommitStar(
    repository: { id: number; galaxyX: number; galaxyY: number; galaxyZ: number },
    commitId: number,
    sha: string,
    message: string,
    ageRatio: number,
  ) {
    const typeKey = this.getCommitTypeKey(message);
    const coords = this.toRepoClusterCoords(
      repository.galaxyX,
      repository.galaxyY,
      repository.galaxyZ,
      this.hashStringToNumber(repository.id.toString()),
      this.hashStringToNumber(sha),
      typeKey,
      0.035 + ageRatio * 0.02,
    );
    const color = this.getCommitColor(message);

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
          color,
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
        color,
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

  private toRepoClusterCoords(
    centerX: number,
    centerY: number,
    centerZ: number,
    repoSeed: number,
    commitSeed: number,
    typeKey: string,
    radius: number,
  ) {
    const typeSeed = this.hashStringToNumber(typeKey);
    const clusterRng = mulberry32(repoSeed ^ typeSeed);
    const clusterAngle = clusterRng() * Math.PI * 2;
    const clusterDistance = radius * (1.2 + clusterRng() * 0.6);
    const clusterCenterX = centerX + Math.cos(clusterAngle) * clusterDistance;
    const clusterCenterY = centerY + Math.sin(clusterAngle) * clusterDistance;
    const clusterCenterZ = centerZ + (clusterRng() - 0.5) * 0.03;

    const rng = mulberry32(commitSeed);
    const angle = rng() * Math.PI * 2;
    const distance = Math.sqrt(rng()) * radius * 0.6;
    const x = clusterCenterX + Math.cos(angle) * distance;
    const y = clusterCenterY + Math.sin(angle) * distance;
    const z = clusterCenterZ + (rng() - 0.5) * 0.02;

    return {
      x: Math.min(0.98, Math.max(0.02, x)),
      y: Math.min(0.98, Math.max(0.02, y)),
      z: Math.min(0.98, Math.max(0.02, z)),
    };
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

  private getCommitColor(message: string) {
    const normalized = message.trim().toLowerCase();
    if (normalized.startsWith("feat")) {
      return "#FFD166";
    }
    if (normalized.startsWith("fix")) {
      return "#EF476F";
    }
    if (normalized.startsWith("docs")) {
      return "#118AB2";
    }
    return "#E5E5E5";
  }

  private getCommitTypeKey(message: string) {
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

  // Github API 호출 함수 (rate limit, 권한, 미존재 예외 처리)
  private async githubGet<T>(url: string, accessToken: string): Promise<AxiosResponse<T>> {
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
