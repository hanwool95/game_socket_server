import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GameGateway } from './game/game.gateway';
import { HttpModule } from '@nestjs/axios';
import { PrismaService } from './prisma.service';
import { YoutubeModule } from './youtube/youtube.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [HttpModule, YoutubeModule],
  controllers: [AppController],
  providers: [AppService, GameGateway, PrismaService],
})
export class AppModule {}
