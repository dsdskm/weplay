-- AlterEnum
ALTER TYPE "FeatureKey" ADD VALUE 'MANITTO';

-- CreateTable
CREATE TABLE "ManittoRound" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ManittoRound_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManittoAssignment" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "giverId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ManittoAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManittoMessage" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ManittoMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ManittoRound_groupId_status_idx" ON "ManittoRound"("groupId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ManittoAssignment_roundId_giverId_key" ON "ManittoAssignment"("roundId", "giverId");

-- CreateIndex
CREATE UNIQUE INDEX "ManittoAssignment_roundId_receiverId_key" ON "ManittoAssignment"("roundId", "receiverId");

-- CreateIndex
CREATE INDEX "ManittoAssignment_receiverId_idx" ON "ManittoAssignment"("receiverId");

-- CreateIndex
CREATE INDEX "ManittoMessage_assignmentId_createdAt_idx" ON "ManittoMessage"("assignmentId", "createdAt");

-- AddForeignKey
ALTER TABLE "ManittoRound" ADD CONSTRAINT "ManittoRound_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManittoAssignment" ADD CONSTRAINT "ManittoAssignment_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "ManittoRound"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManittoAssignment" ADD CONSTRAINT "ManittoAssignment_giverId_fkey" FOREIGN KEY ("giverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManittoAssignment" ADD CONSTRAINT "ManittoAssignment_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManittoMessage" ADD CONSTRAINT "ManittoMessage_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "ManittoAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManittoMessage" ADD CONSTRAINT "ManittoMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
