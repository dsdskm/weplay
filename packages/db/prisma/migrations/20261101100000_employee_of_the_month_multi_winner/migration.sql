-- DropIndex
DROP INDEX "EmployeeOfTheMonth_groupId_month_key";

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeOfTheMonth_groupId_month_userId_key" ON "EmployeeOfTheMonth"("groupId", "month", "userId");

-- AlterTable: 그룹별 선정 인원 (기본 1명, 최대 5명)
ALTER TABLE "EmployeeOfTheMonthSetting" ADD COLUMN "winnerCount" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "EmployeeOfTheMonthSetting" ADD CONSTRAINT "EmployeeOfTheMonthSetting_winnerCount_check" CHECK ("winnerCount" BETWEEN 1 AND 5);
