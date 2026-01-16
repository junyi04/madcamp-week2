import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FriendRequestStatus } from '@prisma/client';

@Injectable()
export class FriendsService {
    constructor(private readonly prisma: PrismaService) { }

    async createFriendRequest(requesterId: number, targetUserId: number) {
        if (requesterId === targetUserId) {
            throw new BadRequestException('Cannot request yourself.');
        }

        const targetUser = await this.prisma.user.findUnique({
            where: { id: targetUserId },
            select: { id: true },
        });

        if (!targetUser) {
            throw new NotFoundException('Target user not found.');
        }

        const existingFriendship = await this.prisma.friendship.findUnique({
            where: {
                userId_friendId: {
                    userId: requesterId,
                    friendId: targetUserId,
                },
            },
            select: { id: true, deletedAt: true },
        });

        if (existingFriendship && !existingFriendship.deletedAt) {
            throw new ConflictException('Already friends.');
        }

        // A가 B에게 요청을 보내는데 B가 이미 A에게 요청을 보내 둔 상태인지
        const reverseRequest = await this.prisma.friendRequest.findUnique({
            where: {
                requesterId_receiverId: {
                    requesterId: targetUserId,
                    receiverId: requesterId,
                },
            },
        });

        if (reverseRequest?.status === FriendRequestStatus.PENDING) {
            throw new ConflictException('Incoming request already exists.');
        }

        const existingRequest = await this.prisma.friendRequest.findUnique({
            where: {
                requesterId_receiverId: {
                    requesterId,
                    receiverId: targetUserId,
                },
            },
        });

        if (existingRequest) {
            if (existingRequest.status === FriendRequestStatus.PENDING) {
                throw new ConflictException('Friend request already exists.');
            }

            if (existingRequest.status === FriendRequestStatus.ACCEPTED) {
                throw new ConflictException('Already friends.');
            }

            return this.prisma.friendRequest.update({
                where: {
                    requesterId_receiverId: {
                        requesterId,
                        receiverId: targetUserId,
                    },
                },
                data: {
                    status: FriendRequestStatus.PENDING,
                    respondedAt: null,
                },
            });
        }

        return this.prisma.friendRequest.create({
            data: {
                requesterId,
                receiverId: targetUserId,
            },
        });
    }

    async getIncomingFriendRequests(receiverId: number) {
        const receiverUser = await this.prisma.user.findUnique({
            where: { id: receiverId }
        })

        if (!receiverUser) {
            throw new NotFoundException("User not found");
        }

        return this.prisma.friendRequest.findMany({
            where: {
                receiverId: receiverId,
                status: FriendRequestStatus.PENDING
            }
        })
    }

    async getOutgoingFriendRequests(requesterId: number) {
        const requesterUser = await this.prisma.user.findUnique({
            where: { id: requesterId }
        })

        if (!requesterUser) {
            throw new NotFoundException("User not found");
        }

        return this.prisma.friendRequest.findMany({
            where: {
                requesterId: requesterId,
                status: FriendRequestStatus.PENDING
            }
        })
    }

    async acceptFriendRequest(receiverId: number, requestId: number) {
        const request = await this.prisma.friendRequest.findUnique({
            where: { id: requestId },
        });

        if (!request) {
            throw new NotFoundException('Friend request not found.');
        }

        if (request.receiverId !== receiverId) {
            throw new ForbiddenException('Not your friend request.');
        }

        if (request.status !== FriendRequestStatus.PENDING) {
            throw new ConflictException('Friend request already processed.');
        }

        return this.prisma.$transaction(async (tx) => {
            const updated = await tx.friendRequest.update({
                where: { id: requestId },
                data: {
                    status: FriendRequestStatus.ACCEPTED,
                    respondedAt: new Date(),
                },
            });

            await tx.friendship.upsert({
                where: {
                    userId_friendId: {
                        userId: receiverId,
                        friendId: request.requesterId,
                    },
                },
                update: {
                    deletedAt: null,
                },
                create: {
                    userId: receiverId,
                    friendId: request.requesterId,
                },
            });

            await tx.friendship.upsert({
                where: {
                    userId_friendId: {
                        userId: request.requesterId,
                        friendId: receiverId,
                    },
                },
                update: {
                    deletedAt: null,
                },
                create: {
                    userId: request.requesterId,
                    friendId: receiverId,
                },
            });

            return updated;
        });
    }

    async rejectFriendRequest(receiverId: number, requestId: number) {
        const request = await this.prisma.friendRequest.findUnique({
            where: { id: requestId },
        });

        if (!request) {
            throw new NotFoundException('Friend request not found.');
        }

        if (request.receiverId !== receiverId) {
            throw new ForbiddenException('Not your friend request.');
        }

        if (request.status !== FriendRequestStatus.PENDING) {
            throw new ConflictException('Friend request already processed.');
        }

        return this.prisma.$transaction(async (tx) => {
            const updated = await tx.friendRequest.update({
                where: { id: requestId },
                data: {
                    status: FriendRequestStatus.REJECTED,
                    respondedAt: new Date(),
                },
            });
            return updated;
        });
    }

    async getFriendsList(userId: number){
        const user = await this.prisma.user.findUnique({
            where: { id: userId }
        })

        if (!user) {
            throw new NotFoundException("User not found");
        }

        return this.prisma.friendship.findMany({
            where: {
                userId: userId,
                deletedAt: null,
            },
            include: {friend: true}
        })
    }

    async deleteFriend(userId: number, friendId: number) {
        if (userId === friendId) {
            throw new BadRequestException('Cannot delete yourself.');
        }

        const friendUser = await this.prisma.user.findUnique({
            where: { id: friendId },
            select: { id: true },
        });

        if (!friendUser) {
            throw new NotFoundException('Friend user not found.');
        }

        const existingFriendship = await this.prisma.friendship.findUnique({
            where: {
                userId_friendId: {
                    userId,
                    friendId,
                },
            },
            select: { id: true, deletedAt: true },
        });

        if (!existingFriendship || existingFriendship.deletedAt) {
            throw new NotFoundException('Friend relationship not found.');
        }

        return this.prisma.$transaction(async (tx) => {
            const friendshipResult = await tx.friendship.updateMany({
                where: {
                    OR: [
                        { userId, friendId },
                        { userId: friendId, friendId: userId },
                    ],
                },
                data: {
                    deletedAt: new Date(),
                },
            });

            await tx.friendRequest.deleteMany({
                where: {
                    OR: [
                        { requesterId: userId, receiverId: friendId },
                        { requesterId: friendId, receiverId: userId },
                    ],
                },
            });

            return { deletedCount: friendshipResult.count };
        });
    }
}
