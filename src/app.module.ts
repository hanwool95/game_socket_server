import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GameGateway } from './game/game.gateway';
import { HttpModule } from '@nestjs/axios';
import { PrismaService } from './prisma.service';

@Module({
  imports: [HttpModule],
  controllers: [AppController],
  providers: [AppService, GameGateway, PrismaService],
})
export class AppModule {}
