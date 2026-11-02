-- CreateTable
CREATE TABLE "ComplimentSetting" (
    "groupId" TEXT NOT NULL,
    "dailyLimit" INTEGER NOT NULL DEFAULT 3,
    "updatedById" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComplimentSetting_pkey" PRIMARY KEY ("groupId"),
    CONSTRAINT "ComplimentSetting_dailyLimit_check" CHECK ("dailyLimit" BETWEEN 1 AND 20)
);

-- AddForeignKey
ALTER TABLE "ComplimentSetting" ADD CONSTRAINT "ComplimentSetting_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
