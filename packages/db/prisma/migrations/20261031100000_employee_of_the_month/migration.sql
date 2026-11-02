-- RenameEnumValue
ALTER TYPE "FeatureKey" RENAME VALUE 'MONTHLY_EMPLOYEE' TO 'EMPLOYEE_OF_THE_MONTH';

-- RenameTable (EmployeeOfMonth -> EmployeeOfTheMonth)
ALTER TABLE "EmployeeOfMonth" RENAME TO "EmployeeOfTheMonth";
ALTER TABLE "EmployeeOfTheMonth" RENAME CONSTRAINT "EmployeeOfMonth_pkey" TO "EmployeeOfTheMonth_pkey";
ALTER TABLE "EmployeeOfTheMonth" RENAME CONSTRAINT "EmployeeOfMonth_groupId_fkey" TO "EmployeeOfTheMonth_groupId_fkey";
ALTER TABLE "EmployeeOfTheMonth" RENAME CONSTRAINT "EmployeeOfMonth_userId_fkey" TO "EmployeeOfTheMonth_userId_fkey";
ALTER INDEX "EmployeeOfMonth_groupId_month_key" RENAME TO "EmployeeOfTheMonth_groupId_month_key";
ALTER INDEX "EmployeeOfMonth_userId_idx" RENAME TO "EmployeeOfTheMonth_userId_idx";

-- CreateTable
CREATE TABLE "EmployeeOfTheMonthNomination" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "nominatorId" TEXT NOT NULL,
    "nomineeId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeOfTheMonthNomination_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeOfTheMonthSetting" (
    "groupId" TEXT NOT NULL,
    "publishDay" INTEGER NOT NULL DEFAULT 1,
    "updatedById" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeOfTheMonthSetting_pkey" PRIMARY KEY ("groupId"),
    CONSTRAINT "EmployeeOfTheMonthSetting_publishDay_check" CHECK ("publishDay" BETWEEN 1 AND 28)
);

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeOfTheMonthNomination_groupId_month_nominatorId_key" ON "EmployeeOfTheMonthNomination"("groupId", "month", "nominatorId");

-- CreateIndex
CREATE INDEX "EmployeeOfTheMonthNomination_nomineeId_idx" ON "EmployeeOfTheMonthNomination"("nomineeId");

-- AddForeignKey
ALTER TABLE "EmployeeOfTheMonthNomination" ADD CONSTRAINT "EmployeeOfTheMonthNomination_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeOfTheMonthNomination" ADD CONSTRAINT "EmployeeOfTheMonthNomination_nominatorId_fkey" FOREIGN KEY ("nominatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeOfTheMonthNomination" ADD CONSTRAINT "EmployeeOfTheMonthNomination_nomineeId_fkey" FOREIGN KEY ("nomineeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeOfTheMonthSetting" ADD CONSTRAINT "EmployeeOfTheMonthSetting_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
