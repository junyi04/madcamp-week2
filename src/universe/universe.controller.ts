import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UniverseService } from './universe.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('universe')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'))
export class UniverseController {
  constructor(private readonly universeService: UniverseService) { }

  @Get('me/summary')
  @ApiOperation({ summary: "내 우주 요약" })
  async getMySummary(
    @Req() req: { user?: { userId?: number } },
    @Query('range') range?: string,
    @Query('types') types?: string,
  ) {

    if (!req.user?.userId) {
      throw new UnauthorizedException('Missing user id.');
    }

    const userId = Number(req.user.userId);

    if (Number.isNaN(userId)) {
      throw new BadRequestException('Invalid user id.');
    }

    return this.universeService.getMySummary(userId, range, types);
  }

  @Get('users/:userId/summary')
  @ApiOperation({ summary: "친구 우주 요약" })
  async getUserSummary(
    @Req() req: { user?: { userId?: number } },
    @Param('userId') userIdParam: string,
    @Query('range') range?: string,
    @Query('types') types?: string,
  ) {
    if (!req.user?.userId) {
      throw new UnauthorizedException('Missing user id.');
    }

    const viewerId = Number(req.user.userId);
    const targetUserId = Number(userIdParam);

    if (Number.isNaN(viewerId) || Number.isNaN(targetUserId)) {
      throw new BadRequestException('Invalid user id.');
    }

    return this.universeService.getUserSummary(viewerId, targetUserId, range, types);
  }

  @Get('me/galaxies/:repoId')
  @ApiOperation({ summary: "내 우주에 있는 Star 정보 불러오기" })
  async getMyGalaxy(
    @Req() req: { user?: { userId?: number } },
    @Param('repoId') repoIdParam: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('types') types?: string,
  ) {
    if (!req.user?.userId) {
      throw new UnauthorizedException('Missing user id.');
    }

    const userId = Number(req.user.userId);
    const repoId = Number(repoIdParam);

    if (Number.isNaN(userId) || Number.isNaN(repoId)) {
      throw new BadRequestException('Invalid id.');
    }

    return this.universeService.getMyGalaxy(
      userId,
      repoId,
      from,
      to,
      types,
    );
  }

  @Get('users/:userId/galaxies/:repoId')
  @ApiOperation({ summary: "친구 은하 상세" })
  async getUserGalaxy(
    @Req() req: { user?: { userId?: number } },
    @Param('userId') userIdParam: string,
    @Param('repoId') repoIdParam: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('types') types?: string,
  ) {
    if (!req.user?.userId) {
      throw new UnauthorizedException('Missing user id.');
    }

    const viewerId = Number(req.user.userId);
    const targetUserId = Number(userIdParam);
    const repoId = Number(repoIdParam);

    if (
      Number.isNaN(viewerId) ||
      Number.isNaN(targetUserId) ||
      Number.isNaN(repoId)
    ) {
      throw new BadRequestException('Invalid id.');
    }

    return this.universeService.getUserGalaxy(
      viewerId,
      targetUserId,
      repoId,
      from,
      to,
      types,
    );
  }
}
