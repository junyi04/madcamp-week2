import { Injectable, UnauthorizedException } from "@nestjs/common";
import { GithubCodeDto } from "./dto/user.dto";
import { ConfigService } from "@nestjs/config";
import axios, { AxiosResponse } from "axios";
import { PrismaService } from "../prisma.service";

export interface IGithubUserTypes {
  githubId: string;
  avatar: string;
  name: string;
  description: string;
  location: string;

  accessToken: string;
  totalStats: number;
  publicRepos: number;
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
  ) { }

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

    const githubInfo: IGithubUserTypes = {
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
    await this.prisma.githubUser.upsert({
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
        publicRepos: public_repos
      },
    });

    return githubInfo;
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

    // 2. 현재 로그인한 유저의 id 가져오기
    const user = await this.prisma.githubUser.findUnique({
      where: {
        githubId: data[0]?.owner.login
      },
    });

    if (!user) {
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
          userId: user.id,
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

    const repository = await this.prisma.repository.findFirst({
      where: { name: repo },
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
}