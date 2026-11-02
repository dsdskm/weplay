-- CreateTable
CREATE TABLE "DailyPick" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "teamId" TEXT,
    "date" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "promptKey" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyPick_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GamePhoto" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'BELONGING',
    "mediaUrl" TEXT NOT NULL,
    "caption" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GamePhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfileFact" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfileFact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DailyPick_groupId_date_kind_idx" ON "DailyPick"("groupId", "date", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "DailyPick_groupId_userId_date_kind_key" ON "DailyPick"("groupId", "userId", "date", "kind");

-- CreateIndex
CREATE INDEX "GamePhoto_groupId_kind_idx" ON "GamePhoto"("groupId", "kind");

-- CreateIndex
CREATE INDEX "ProfileFact_groupId_idx" ON "ProfileFact"("groupId");

-- AddForeignKey
ALTER TABLE "DailyPick" ADD CONSTRAINT "DailyPick_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GamePhoto" ADD CONSTRAINT "GamePhoto_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileFact" ADD CONSTRAINT "ProfileFact_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

