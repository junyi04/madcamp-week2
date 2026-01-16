import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import UserService from "./user.service";
import { GithubCodeDto } from "./dto/user.dto";

// http://localhost:3000/oauth로 들어오는 요청 처리 선언
@Controller('oauth')
export default class UserController {
  constructor (
    private readonly userService: UserService,
  ) {}

  // POST 형식으로 /oauth/github-info 주소에 데이터 보내면 함수 실행
  @Post('/github-info')
  public async getGithubInfo(@Body() githubCodeDto: GithubCodeDto) {
    const user = await this.userService.getGithubInfo(githubCodeDto);

    return {
      stats: 200,
      message: '깃허브 유저 정보를 조회하였습니댜.',
      data: { user },
    };
  }

  // 깃허브 로그인 콜백
  @Get('/github/callback')
  public async gitbuhCallback(@Query('code') code: string) {
    return {
      message: '로그인 성공!',
      code: code
    };
  }

  // 레포 가져오기
  @Get('/repos')
  public async getRepos(@Query('accessToken') accessToken: string) {
    return await this.userService.getRepos(accessToken);
  }

  // 커밋 가져오기
  @Get('/commits')
  public async getCommits(
    @Query('accessToken') accessToken: string,
    @Query('owner') owner: string,
    @Query('repo') repo: string,
  ) {
    return await this.userService.getCommits(accessToken, owner, repo);
  }

  @Get('/search')
  public async searchAppUsers(@Query('query') query: string) {
    const users = await this.userService.searchAppUsers(query);
    return {
      stats: 200,
      message: '유저 검색 결과입니다.',
      data: users,
    }
  }




  // src/auth/user.controller.ts

@Get('/seed-test-data')
public async seedTestData() {
  return await this.userService.createMockFriendData();
}
}