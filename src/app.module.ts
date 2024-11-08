import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GameGateway } from './game/game.gateway';
import { HttpModule } from '@nestjs/axios';
import { YoutubeModule } from './youtube/youtube.module';
import {PokemonCardModule} from "./pokemon-card/pokemon-card.module";
import {PrismaModule} from "./prisma/prisma.module";

@Module({
  imports: [HttpModule, YoutubeModule, PokemonCardModule, PrismaModule],
  controllers: [AppController],
  providers: [AppService, GameGateway],
})
export class AppModule {}
