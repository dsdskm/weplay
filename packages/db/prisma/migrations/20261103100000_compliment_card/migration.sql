-- AlterEnum
ALTER TYPE "FeatureKey" ADD VALUE 'COMPLIMENT_CARD';

-- CreateTable
CREATE TABLE "ComplimentCard" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComplimentCard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ComplimentCard_groupId_month_receiverId_idx" ON "ComplimentCard"("groupId", "month", "receiverId");

-- CreateIndex
CREATE INDEX "ComplimentCard_groupId_senderId_month_idx" ON "ComplimentCard"("groupId", "senderId", "month");

-- AddForeignKey
ALTER TABLE "ComplimentCard" ADD CONSTRAINT "ComplimentCard_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplimentCard" ADD CONSTRAINT "ComplimentCard_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplimentCard" ADD CONSTRAINT "ComplimentCard_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
