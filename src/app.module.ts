import { FriendsModule } from './friends/friends.module';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import UserController from './auth/user.controller';
import UserService from './auth/user.service';
import { PrismaService } from './prisma.service';
import { UniverseModule } from './universe/universe.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    FriendsModule,
    UniverseModule
  ],
  controllers: [
    AppController,
    UserController,
  ],
  providers: [
    AppService,
    UserService,
    PrismaService,
  ],
})
export class AppModule {}
