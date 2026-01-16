import { Injectable, UnauthorizedException } from "@nestjs/common";
import { GithubCodeDto } from "./dto/user.dto";
import { ConfigService } from "@nestjs/config";
import axios, { AxiosResponse } from "axios";
import { PrismaService } from "src/prisma/prisma.service";
import { JwtService } from "@nestjs/jwt";

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

  public async getGithubInfo(GithubCodeDto: GithubCodeDto): Promise<IGithubUserTypes> {
    const { code } = GithubCodeDto;

    // .env 파일에 적은 변수명을 configService.get()에 넣기
    const clientId = this.configService.get<string>('GITHUB_CLIENT_ID');
    const clientSecret = this.configService.get<string>('GITHUB_CLIENT_SECRET');

    const getTokenUrl: string = 'https://github.com/login/oauth/access_token';

    // body
    const request = {
      code,
      client_id: clientId,
      client_secret: clientSecret,
    };

    // json 반환 요청
    const response: AxiosResponse = await axios.post(getTokenUrl, request, {
      headers: {
        accept: 'application/json'
      },
    });

    // 에러 발생 시
    if (response.data.error) {
      throw new UnauthorizedException(401, '깃허브 인증을 실패했습니다.')
    }

    // 요청 성공 시
    const { access_token } = response.data;

    // 깃허브 유저 조회 API 주소
    const getUserUrl: string = 'https://api.github.com/user';

    const { data } = await axios.get(getUserUrl, {
      headers: {
        Authorization: `token ${access_token}`,
      },
    });

    // API에서 받은 데이터를 골라서 처리
    const { login, avatar_url, name, bio, company, public_repos, followers } = data;

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

    // 유저 정보 저장, 업데이트
    const githubUser = await this.prisma.githubUser.upsert({
      where: { githubId: login },
      update : {
        accessToken: access_token,
        avatar: avatar_url,
        publicRepos: public_repos,
      },
      create: {
        githubId: login,
        avatar: avatar_url,
        name: name || login,
        accessToken: access_token,
        publicRepos: public_repos
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
      githubId: githubUser.githubId
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      ...githubInfoBase,
      userId: user.id,
      appToken: accessToken,
    };
  }

  // 사이드 바에 둘 레포 목록 가져오기
  public async getRepos(accessToken: string): Promise<IGithubRepo[]> {
    const url = 'https://api.github.com/user/repos?sort=updated&per_page=100';

    // 1. 깃허브 API에서 원본 데이터 가져오기
    const { data } = await axios.get(url, {
      headers: {
        Authorization: `token ${accessToken}`
      },
    });

    const userResponse = await axios.get('https://api.github.com/user', {
      headers: {
        Authorization: `token ${accessToken}`
      },
    });

    const githubLogin = userResponse.data.login;

    // 2. 현재 로그인한 유저의 id 가져오기
    const githubUser = await this.prisma.githubUser.findUnique({
      where: {
        githubId: githubLogin
      },
    });

    if (!githubUser) {
      throw new UnauthorizedException('유저 정보를 먼저 등록해야 합니다.');
    }

    // 3. 레포를 순회하며 DB에 저장
    for (const repo of data) {
      if (repo.archived || repo.disabled) continue;

      await this.prisma.repository.upsert({
        where: { repoId: BigInt(repo.id) },
        update: {
          name: repo.name,
          updatedAt: repo.updated_at,
        },
        create: {
          repoId: BigInt(repo.id),
          name: repo.name,
          updatedAt: repo.updated_at,
          userId: githubUser.id,
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

  // 선택한 레포의 커밋 가져오기
  public async getCommits(accessToken: string, owner: string, repo: string): Promise<IcommitStar[]> {
    const url = `https://api.github.com/repos/${owner}/${repo}/commits?per_page=30` // 최근 30개

    const { data } = await axios.get(url, {
      headers: {
        Authorization: `token ${accessToken}`
      },
    });

    const ownerUser = await this.prisma.githubUser.findUnique({
      where: {
        githubId: owner
      }
    });

    const repository = await this.prisma.repository.findFirst({
      where: { 
        name: repo,
        userId: ownerUser?.id
      },
    });

    if (!repository) {
      throw new UnauthorizedException('해당 레포지토리가 DB에 존재하지 않습니다. 레포 목록을 불러와주세요.');
    }

    for (const item of data) {
      await this.prisma.commit.upsert({
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
    }

    return data.map((item: any) => ({
      sha: item.sha,
      message: item.commit.message,
      date: item.commit.author.date,
    }))
  }

  public async searchAppUsers(query: string) {
    return await this.prisma.user.findMany({
      where: {
        githubUser: {
          githubId: {
            contains: query, // 검색어 포함 여부
            mode: 'insensitive', // 대소문자 구분 X
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






// src/auth/user.service.ts

async createMockFriendData() {
  // 1. 가짜 깃허브 유저 생성
  const mockGithubUser = await this.prisma.githubUser.upsert({
    where: { githubId: 'testfriend' },
    update: {},
    create: {
      githubId: 'testfriend',
      avatar: 'https://github.com/identicons/test.png',
      name: '테스트친구',
      accessToken: 'dummy_token_123',
      publicRepos: 10,
    },
  });

  // 2. 가짜 서비스 유저 생성
  const mockUser = await this.prisma.user.upsert({
    where: { githubUserId: mockGithubUser.id },
    update: {},
    create: {
      nickname: '별헤는친구',
      githubUserId: mockGithubUser.id,
    },
  });

  // 3. 문제의 Repository 생성
  const mockRepo = await this.prisma.repository.upsert({
    where: { repoId: BigInt(1999902393) },
    update: { name: 'test-repo' },
    create: {
      repoId: BigInt(1999902393),
      name: 'test-repo',
      updatedAt: new Date().toISOString(),
      userId: mockGithubUser.id,
    },
  });

  // 4. 가짜 친구용 JWT 토큰 발급
  const payload = { 
    userId: mockUser.id, 
    githubId: mockGithubUser.githubId 
  };
  const mockAppToken = this.jwtService.sign(payload);

  return { 
    message: "가짜 데이터 생성 성공!",
    mockUserId: mockUser.id, 
    mockGithubId: mockGithubUser.githubId,
    mockAppToken: mockAppToken,
    repoName: mockRepo.name 
  };
}
}
