import {Controller, Get, Param} from "@nestjs/common";
import {PokemonCardService} from "./pokemon-card.service";

@Controller('pokemon-card')
export class PokemonCardController {
    constructor(private readonly pokemonCardService: PokemonCardService) {
    }

    @Get('/pack/:name')
    async getPackCards(@Param('name') name: string) {
        return await this.pokemonCardService.getPackCards(name)
    }
}