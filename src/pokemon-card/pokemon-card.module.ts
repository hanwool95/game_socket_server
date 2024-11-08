import {Module} from "@nestjs/common";
import {PokemonCardService} from "./pokemon-card.service";
import {PokemonCardController} from "./pokemon-card.controller";
import {PrismaModule} from "../prisma/prisma.module";

@Module({
    imports: [PrismaModule],
    providers: [PokemonCardService],
    controllers: [PokemonCardController],
})
export class PokemonCardModule {}