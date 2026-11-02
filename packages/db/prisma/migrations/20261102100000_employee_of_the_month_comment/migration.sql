-- CreateTable
CREATE TABLE "EmployeeOfTheMonthComment" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeOfTheMonthComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmployeeOfTheMonthComment_groupId_month_targetUserId_idx" ON "EmployeeOfTheMonthComment"("groupId", "month", "targetUserId");

-- CreateIndex
CREATE INDEX "EmployeeOfTheMonthComment_authorId_idx" ON "EmployeeOfTheMonthComment"("authorId");

-- AddForeignKey
ALTER TABLE "EmployeeOfTheMonthComment" ADD CONSTRAINT "EmployeeOfTheMonthComment_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeOfTheMonthComment" ADD CONSTRAINT "EmployeeOfTheMonthComment_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeOfTheMonthComment" ADD CONSTRAINT "EmployeeOfTheMonthComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
