-- CreateTable
CREATE TABLE "PointLedger" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "refId" TEXT NOT NULL,
    "memo" TEXT NOT NULL,
    "counterpartId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PointLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BingoBoard" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "week" TEXT NOT NULL,
    "missions" JSONB NOT NULL,
    "size" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BingoBoard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BingoCell" (
    "id" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "mediaUrl" TEXT NOT NULL,
    "mediaType" TEXT NOT NULL,
    "caption" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BingoCell_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TurnGame" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "teamId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RECRUITING',
    "config" JSONB NOT NULL,
    "createdById" TEXT NOT NULL,
    "currentUserId" TEXT,
    "turnIndex" INTEGER NOT NULL DEFAULT 0,
    "turnDeadline" TIMESTAMP(3),
    "result" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "TurnGame_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TurnParticipant" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TurnParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TurnEntry" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "text" TEXT,
    "mediaUrl" TEXT,
    "reply" TEXT,
    "targetUserId" TEXT,
    "correct" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TurnEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PointLedger_groupId_userId_createdAt_idx" ON "PointLedger"("groupId", "userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PointLedger_groupId_userId_kind_refId_key" ON "PointLedger"("groupId", "userId", "kind", "refId");

-- CreateIndex
CREATE UNIQUE INDEX "BingoBoard_teamId_week_key" ON "BingoBoard"("teamId", "week");

-- CreateIndex
CREATE UNIQUE INDEX "BingoCell_boardId_index_key" ON "BingoCell"("boardId", "index");

-- CreateIndex
CREATE INDEX "TurnGame_groupId_status_idx" ON "TurnGame"("groupId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "TurnParticipant_gameId_userId_key" ON "TurnParticipant"("gameId", "userId");

-- CreateIndex
CREATE INDEX "TurnEntry_gameId_createdAt_idx" ON "TurnEntry"("gameId", "createdAt");

-- AddForeignKey
ALTER TABLE "PointLedger" ADD CONSTRAINT "PointLedger_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointLedger" ADD CONSTRAINT "PointLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BingoBoard" ADD CONSTRAINT "BingoBoard_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BingoCell" ADD CONSTRAINT "BingoCell_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "BingoBoard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TurnGame" ADD CONSTRAINT "TurnGame_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TurnParticipant" ADD CONSTRAINT "TurnParticipant_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "TurnGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TurnEntry" ADD CONSTRAINT "TurnEntry_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "TurnGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;

