-- CreateTable
CREATE TABLE "PointRuleDefault" (
    "metric" TEXT NOT NULL,
    "points" INTEGER NOT NULL,

    CONSTRAINT "PointRuleDefault_pkey" PRIMARY KEY ("metric")
);

-- CreateTable
CREATE TABLE "BadgeDefault" (
    "key" TEXT NOT NULL,
    "target" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "BadgeDefault_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "GroupPointRule" (
    "groupId" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "updatedById" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GroupPointRule_pkey" PRIMARY KEY ("groupId", "metric")
);

-- CreateTable
CREATE TABLE "GroupBadgeRule" (
    "groupId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "target" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL,
    "updatedById" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GroupBadgeRule_pkey" PRIMARY KEY ("groupId", "key")
);

-- CreateTable
CREATE TABLE "PointAdjustment" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PointAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PointAdjustment_groupId_userId_idx" ON "PointAdjustment"("groupId", "userId");

-- AddForeignKey
ALTER TABLE "GroupPointRule" ADD CONSTRAINT "GroupPointRule_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupBadgeRule" ADD CONSTRAINT "GroupBadgeRule_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointAdjustment" ADD CONSTRAINT "PointAdjustment_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointAdjustment" ADD CONSTRAINT "PointAdjustment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 기본값 (MASTER가 바꾸기 전까지 적용)
INSERT INTO "PointRuleDefault" ("metric", "points") VALUES
    ('sentCard', 2), ('receivedCard', 3), ('nomination', 1), ('win', 10), ('comment', 1);

INSERT INTO "BadgeDefault" ("key", "target", "enabled") VALUES
    ('FIRST_COMPLIMENT', 1, true), ('COMPLIMENT_MAKER', 10, true), ('POPULAR', 10, true),
    ('NOMINATOR', 5, true), ('MVP', 1, true), ('REGULAR_MVP', 3, true), ('TALKER', 10, true);
