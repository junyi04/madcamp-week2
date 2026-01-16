import { Module } from '@nestjs/common';
import { UniverseController } from './universe.controller';
import { UniverseService } from './universe.service';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [UniverseController],
  providers: [UniverseService, PrismaService],
})
export class UniverseModule {}
