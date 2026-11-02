-- AlterEnum
ALTER TYPE "FeatureKey" ADD VALUE 'DUTY_ROSTER';

-- CreateTable
CREATE TABLE "Duty" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "teamId" TEXT,
    "name" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT '📌',
    "description" TEXT,
    "mode" TEXT NOT NULL DEFAULT 'ROTATION',
    "period" TEXT NOT NULL DEFAULT 'WEEKLY',
    "memberIds" JSONB NOT NULL,
    "anchorDate" TEXT NOT NULL,
    "offset" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Duty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DutyLog" (
    "id" TEXT NOT NULL,
    "dutyId" TEXT NOT NULL,
    "periodKey" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "originalId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ASSIGNED',
    "memo" TEXT,
    "doneAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DutyLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Duty_groupId_active_idx" ON "Duty"("groupId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "DutyLog_dutyId_periodKey_key" ON "DutyLog"("dutyId", "periodKey");

-- AddForeignKey
ALTER TABLE "Duty" ADD CONSTRAINT "Duty_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DutyLog" ADD CONSTRAINT "DutyLog_dutyId_fkey" FOREIGN KEY ("dutyId") REFERENCES "Duty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

