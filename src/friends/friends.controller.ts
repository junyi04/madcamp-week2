import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  Post,
  Get,
  Param,
  UnauthorizedException,
  Delete,
} from '@nestjs/common';
import { FriendsService } from './friends.service';
import { CreateFriendRequestDto } from './dto/create-friend-request.dto';
import { ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Friends')
@Controller('friends')
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) { }


  @Post('requests')
  @ApiOperation({summary: '친구 요청 보내기'})
  @ApiResponse({status: 201, description: '요청 생성 성공'})
  @ApiBody({type: CreateFriendRequestDto})
  async createFriendRequest(
    @Headers('x-user-id') userIdHeader: string | undefined,
    @Body() dto: CreateFriendRequestDto,
  ) {
    if (!userIdHeader) {
      throw new UnauthorizedException('Missing user id.');
    }

    const requesterId = Number(userIdHeader);
    const targetUserId = Number(dto.targetUserId);

    if (Number.isNaN(requesterId) || Number.isNaN(targetUserId)) {
      throw new BadRequestException('Invalid user id.');
    }

    return this.friendsService.createFriendRequest(requesterId, targetUserId);
  }

  @Get('requests/incoming')
  @ApiOperation({ summary: '받은 친구 요청 목록' })
  @ApiResponse({ status: 200, description: '받은 요청 목록 반환' })
  @ApiResponse({ status: 401, description: '미로그인' })
  @ApiResponse({ status: 400, description: '잘못된 user id' })
  @ApiResponse({ status: 404, description: '유저 없음' })
  async getIncomingFriendRequests(
    @Headers('x-user-id') userIdHeader: string | undefined
  ) {
    if (!userIdHeader) {
      throw new UnauthorizedException('Missing user id.');
    }

    const receiverId = Number(userIdHeader);

    if (Number.isNaN(receiverId)) {
      throw new BadRequestException('Invalid user id.');
    }

    return this.friendsService.getIncomingFriendRequests(receiverId);
  }

  @Get('requests/outgoing')
  @ApiOperation({ summary: '보낸 친구 요청 목록' })
  @ApiResponse({ status: 200, description: '보낸 요청 목록 반환' })
  @ApiResponse({ status: 401, description: '미로그인' })
  @ApiResponse({ status: 400, description: '잘못된 user id' })
  @ApiResponse({ status: 404, description: '유저 없음' })
  async getOutgoingFriendRequests(
    @Headers('x-user-id') userIdHeader: string | undefined
  ) {
    if (!userIdHeader) {
      throw new UnauthorizedException('Missing user id.');
    }

    const requesterId = Number(userIdHeader);

    if (Number.isNaN(requesterId)) {
      throw new BadRequestException('Invalid user id.');
    }

    return this.friendsService.getOutgoingFriendRequests(requesterId);
  }


  @Get()
  @ApiOperation({ summary: '친구 목록 조회' })
  @ApiResponse({ status: 200, description: '친구 목록 반환' })
  @ApiResponse({ status: 401, description: '미로그인' })
  @ApiResponse({ status: 400, description: '잘못된 user id' })
  @ApiResponse({ status: 404, description: '유저 없음' })
  async getFriendsList(
    @Headers('x-user-id') userIdHeader: string | undefined,
  ) {
    if (!userIdHeader) {
      throw new UnauthorizedException('Missing user id.');
    }

    const userId = Number(userIdHeader);

    if (Number.isNaN(userId)) {
      throw new BadRequestException('Invalid user id.');
    }

    return this.friendsService.getFriendsList(userId);
  }

  @Post('requests/:requestId/accept')
  @ApiOperation({ summary: '친구 요청 수락' })
  @ApiParam({ name: 'requestId', required: true })
  @ApiResponse({ status: 200, description: '요청 수락 처리' })
  @ApiResponse({ status: 401, description: '미로그인' })
  @ApiResponse({ status: 400, description: '잘못된 id' })
  @ApiResponse({ status: 403, description: '본인 요청 아님' })
  @ApiResponse({ status: 404, description: '요청 없음' })
  @ApiResponse({ status: 409, description: '이미 처리됨' })
  async acceptFriendRequest(
    @Headers('x-user-id') userIdHeader: string | undefined,
    @Param('requestId') requestIdParam: string,
  ) {
    if (!userIdHeader) {
      throw new UnauthorizedException('Missing user id.');
    }

    const receiverId = Number(userIdHeader);
    const requestId = Number(requestIdParam);

    if (Number.isNaN(receiverId) || Number.isNaN(requestId)) {
      throw new BadRequestException('Invalid user id.');
    }

    return this.friendsService.acceptFriendRequest(receiverId, requestId);
  }

  @Post('requests/:requestId/reject')
  @ApiOperation({ summary: '친구 요청 거절' })
  @ApiParam({ name: 'requestId', required: true })
  @ApiResponse({ status: 200, description: '요청 거절 처리' })
  @ApiResponse({ status: 401, description: '미로그인' })
  @ApiResponse({ status: 400, description: '잘못된 id' })
  @ApiResponse({ status: 403, description: '본인 요청 아님' })
  @ApiResponse({ status: 404, description: '요청 없음' })
  @ApiResponse({ status: 409, description: '이미 처리됨' })
  async rejectFriendRequest(
    @Headers('x-user-id') userIdHeader: string | undefined,
    @Param('requestId') requestIdParam: string,
  ) {
    if (!userIdHeader) {
      throw new UnauthorizedException('Missing user id.');
    }

    const receiverId = Number(userIdHeader);
    const requestId = Number(requestIdParam);

    if (Number.isNaN(receiverId) || Number.isNaN(requestId)) {
      throw new BadRequestException('Invalid user id.');
    }

    return this.friendsService.rejectFriendRequest(receiverId, requestId);
  }

  @Delete('/:userId')
  @ApiOperation({ summary: '친구 삭제' })
  @ApiParam({ name: 'userId', required: true })
  @ApiResponse({ status: 200, description: '친구 삭제 완료' })
  @ApiResponse({ status: 401, description: '미로그인' })
  @ApiResponse({ status: 400, description: '잘못된 id' })
  @ApiResponse({ status: 404, description: '유저 없음' })
  async deleteFriend(
    @Headers('x-user-id') userIdHeader: string | undefined,
    @Param('userId') friendIdParam: string,
  ) {
    if (!userIdHeader) {
      throw new UnauthorizedException('Missing user id.');
    }

    const userId = Number(userIdHeader);
    const friendId = Number(friendIdParam);

    if (Number.isNaN(userId) || Number.isNaN(friendId)) {
      throw new BadRequestException('Invalid user id.');
    }

    return this.friendsService.deleteFriend(userId, friendId);
  }
}
