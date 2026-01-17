import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    Req,
    UnauthorizedException,
    UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { FriendsService } from './friends.service';
import { CreateFriendRequestDto } from './dto/create-friend-request.dto';

@Controller('friends')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'))
export class FriendsController {
    constructor(private readonly friendsService: FriendsService) {}

    @Post('requests')
    @ApiOperation({ summary: 'Create friend request' })
    async createFriendRequest(
        @Req() req: { user?: { userId?: number } },
        @Body() dto: CreateFriendRequestDto,
    ) {
        if (!req.user?.userId) {
            throw new UnauthorizedException('Missing user id.');
        }

        const requesterId = Number(req.user.userId);
        const targetUserId = Number(dto.targetUserId);

        if (Number.isNaN(requesterId) || Number.isNaN(targetUserId)) {
            throw new BadRequestException('Invalid user id.');
        }

        return this.friendsService.createFriendRequest(requesterId, targetUserId);
    }

    @Get('requests/incoming')
    async getIncomingFriendRequests(
        @Req() req: { user?: { userId?: number } },
    ) {
        if (!req.user?.userId) {
            throw new UnauthorizedException('Missing user id.');
        }

        const receiverId = Number(req.user.userId);

        if (Number.isNaN(receiverId)) {
            throw new BadRequestException('Invalid user id.');
        }

        return this.friendsService.getIncomingFriendRequests(receiverId);
    }

    @Get('requests/outgoing')
    async getOutgoingFriendRequests(
        @Req() req: { user?: { userId?: number } },
    ) {
        if (!req.user?.userId) {
            throw new UnauthorizedException('Missing user id.');
        }

        const requesterId = Number(req.user.userId);

        if (Number.isNaN(requesterId)) {
            throw new BadRequestException('Invalid user id.');
        }

        return this.friendsService.getOutgoingFriendRequests(requesterId);
    }

    @Get()
    async getFriendsList(@Req() req: { user?: { userId?: number } }) {
        if (!req.user?.userId) {
            throw new UnauthorizedException('Missing user id.');
        }

        const userId = Number(req.user.userId);

        if (Number.isNaN(userId)) {
            throw new BadRequestException('Invalid user id.');
        }

        return this.friendsService.getFriendsList(userId);
    }

    @Post('requests/:requestId/accept')
    async acceptFriendRequest(
        @Req() req: { user?: { userId?: number } },
        @Param('requestId') requestIdParam: string,
    ) {
        if (!req.user?.userId) {
            throw new UnauthorizedException('Missing user id.');
        }

        const receiverId = Number(req.user.userId);
        const requestId = Number(requestIdParam);

        if (Number.isNaN(receiverId) || Number.isNaN(requestId)) {
            throw new BadRequestException('Invalid user id.');
        }

        return this.friendsService.acceptFriendRequest(receiverId, requestId);
    }

    @Post('requests/:requestId/reject')
    async rejectFriendRequest(
        @Req() req: { user?: { userId?: number } },
        @Param('requestId') requestIdParam: string,
    ) {
        if (!req.user?.userId) {
            throw new UnauthorizedException('Missing user id.');
        }

        const receiverId = Number(req.user.userId);
        const requestId = Number(requestIdParam);

        if (Number.isNaN(receiverId) || Number.isNaN(requestId)) {
            throw new BadRequestException('Invalid user id.');
        }

        return this.friendsService.rejectFriendRequest(receiverId, requestId);
    }

    @Delete('/:userId')
    async deleteFriend(
        @Req() req: { user?: { userId?: number } },
        @Param('userId') friendIdParam: string,
    ) {
        if (!req.user?.userId) {
            throw new UnauthorizedException('Missing user id.');
        }

        const userId = Number(req.user.userId);
        const friendId = Number(friendIdParam);

        if (Number.isNaN(userId) || Number.isNaN(friendId)) {
            throw new BadRequestException('Invalid user id.');
        }

        return this.friendsService.deleteFriend(userId, friendId);
    }
}
