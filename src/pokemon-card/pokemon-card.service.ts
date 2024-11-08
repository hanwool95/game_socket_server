import {Injectable} from "@nestjs/common";
import {PrismaService} from "../prisma/prisma.service";

@Injectable()
export class PokemonCardService {
    constructor(private readonly prisma: PrismaService) {}

    async getPackCards(pack: string) {
        return this.prisma.pokemonCard.findMany({
            where: { pack }
        })
    }
}