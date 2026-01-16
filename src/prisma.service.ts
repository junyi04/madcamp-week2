import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  // 서버가 켜질 때 DB 연결
  async onModuleInit() {
    await this.$connect();
  }

  // 서버가 꺼질 때 연결 해제
  async onModuleDestroy() {
      await this.$disconnect();
  }
}