-- CreateTable
CREATE TABLE "ComplimentReaction" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComplimentReaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ComplimentReaction_cardId_userId_key" ON "ComplimentReaction"("cardId", "userId");

-- CreateIndex
CREATE INDEX "ComplimentReaction_userId_idx" ON "ComplimentReaction"("userId");

-- AddForeignKey
ALTER TABLE "ComplimentReaction" ADD CONSTRAINT "ComplimentReaction_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "ComplimentCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplimentReaction" ADD CONSTRAINT "ComplimentReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
