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
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth('access-token')
export class UniverseController {
  constructor(private readonly universeService: UniverseService) { }

  @Get('me/summary')
  @ApiOperation({ summary: "내 우주 요약" })
  async getMySummary(
    @Req() req,
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

  @Get('me/galaxies/:repoId')
  @ApiOperation({ summary: "내 우주에 있는 Star 정보 불러오기" })
  async getMyGalaxy(
    @Req() req,
    @Param('repoId') repoIdParam: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('types') types?: string,
    @Query('limit') limitParam?: string,
    @Query('cursor') cursorParam?: string,
  ) {
    if (!req.user?.userId) {
      throw new UnauthorizedException('Missing user id.');
    }

    const userId = Number(req.user.userId);
    const repoId = Number(repoIdParam);

    if (Number.isNaN(userId) || Number.isNaN(repoId)) {
      throw new BadRequestException('Invalid id.');
    }

    const limit = limitParam ? Number(limitParam) : undefined;
    const cursor = cursorParam ? Number(cursorParam) : undefined;

    if (limit !== undefined && (Number.isNaN(limit) || limit <= 0)) {
      throw new BadRequestException('Invalid limit.');
    }

    if (cursor !== undefined && Number.isNaN(cursor)) {
      throw new BadRequestException('Invalid cursor.');
    }

    return this.universeService.getMyGalaxy(
      userId,
      repoId,
      from,
      to,
      types,
      limit,
      cursor,
    );
  }
}