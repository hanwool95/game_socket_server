-- CreateTable
CREATE TABLE "PokemonEmoji" (
    "id" SERIAL NOT NULL,
    "pokemon" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,

    CONSTRAINT "PokemonEmoji_pkey" PRIMARY KEY ("id")
);
