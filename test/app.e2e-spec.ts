import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaClient } from '@prisma/client';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaClient;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = new PrismaClient();
    await prisma.$connect();
  });

  afterEach(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });
});

describe('Friends (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaClient;
  let userAId: number;
  let userBId: number;

  const cleanup = async () => {
    await prisma.friendship.deleteMany();
    await prisma.friendRequest.deleteMany();
    await prisma.user.deleteMany();
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = new PrismaClient();
    await prisma.$connect();

    await cleanup();

    const userA = await prisma.user.create({
      data: { nickname: 'user-a' },
    });
    const userB = await prisma.user.create({
      data: { nickname: 'user-b' },
    });

    userAId = userA.id;
    userBId = userB.id;
  });

  afterAll(async () => {
    await cleanup();
    await prisma.$disconnect();
    await app.close();
  });

  it('creates, accepts, lists, and deletes a friend request', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/friends/requests')
      .set('x-user-id', String(userAId))
      .send({ targetUserId: userBId })
      .expect(201);

    const requestId = createRes.body.id;

    const incomingRes = await request(app.getHttpServer())
      .get('/friends/requests/incoming')
      .set('x-user-id', String(userBId))
      .expect(200);

    expect(incomingRes.body).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: requestId })]),
    );

    await request(app.getHttpServer())
      .post(`/friends/requests/${requestId}/accept`)
      .set('x-user-id', String(userBId))
      .expect(201);

    const friendsRes = await request(app.getHttpServer())
      .get('/friends')
      .set('x-user-id', String(userAId))
      .expect(200);

    expect(friendsRes.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ friendId: userBId }),
      ]),
    );

    const deleteRes = await request(app.getHttpServer())
      .delete(`/friends/${userBId}`)
      .set('x-user-id', String(userAId))
      .expect(200);

    expect(deleteRes.body).toEqual({ deletedCount: 2 });

    const emptyFriendsRes = await request(app.getHttpServer())
      .get('/friends')
      .set('x-user-id', String(userAId))
      .expect(200);

    expect(emptyFriendsRes.body).toEqual([]);
  });
});
