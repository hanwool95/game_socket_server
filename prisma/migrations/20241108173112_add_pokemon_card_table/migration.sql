-- CreateTable
CREATE TABLE "PokemonCard" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "pack" TEXT NOT NULL,
    "image" TEXT NOT NULL,

    CONSTRAINT "PokemonCard_pkey" PRIMARY KEY ("id")
);
