-- AlterEnum
ALTER TYPE "FeatureKey" ADD VALUE 'MINI_GAMES';

-- CreateTable
CREATE TABLE "FeatureConfig" (
    "feature" "FeatureKey" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeatureConfig_pkey" PRIMARY KEY ("feature")
);

-- CreateTable
CREATE TABLE "GameScore" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "game" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "playedOn" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameScore_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GameScore_groupId_game_playedOn_idx" ON "GameScore"("groupId", "game", "playedOn");

-- CreateIndex
CREATE INDEX "GameScore_userId_playedOn_idx" ON "GameScore"("userId", "playedOn");

-- AddForeignKey
ALTER TABLE "GameScore" ADD CONSTRAINT "GameScore_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameScore" ADD CONSTRAINT "GameScore_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

