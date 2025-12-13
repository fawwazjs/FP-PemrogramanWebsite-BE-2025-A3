-- CreateTable
CREATE TABLE "FlashCard" (
    "id" TEXT NOT NULL,
    "game_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "thumbnail" TEXT,
    "settings" JSONB,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "total_played" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FlashCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlashCardItem" (
    "id" TEXT NOT NULL,
    "flash_card_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "question_type" TEXT NOT NULL,
    "question_text" TEXT,
    "question_image" TEXT,
    "back_type" TEXT NOT NULL,
    "answer_text" TEXT NOT NULL,
    "back_image" TEXT,
    "is_correct" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FlashCardItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FlashCard_game_id_key" ON "FlashCard"("game_id");

-- CreateIndex
CREATE INDEX "FlashCard_game_id_idx" ON "FlashCard"("game_id");

-- CreateIndex
CREATE INDEX "FlashCardItem_flash_card_id_position_idx" ON "FlashCardItem"("flash_card_id", "position");

-- AddForeignKey
ALTER TABLE "FlashCard" ADD CONSTRAINT "FlashCard_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "Games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlashCardItem" ADD CONSTRAINT "FlashCardItem_flash_card_id_fkey" FOREIGN KEY ("flash_card_id") REFERENCES "FlashCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;
