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

@Controller('friends')
export class FriendsController {
    constructor(private readonly friendsService: FriendsService) { }

    @Post('requests')
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
