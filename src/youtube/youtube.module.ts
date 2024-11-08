import { Module } from '@nestjs/common';
import { YoutubeService } from './youtube.service';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { YoutubeController } from './youtube.controller';

@Module({
  imports: [HttpModule, ConfigModule],
  controllers: [YoutubeController],
  providers: [YoutubeService],
})
export class YoutubeModule {}
