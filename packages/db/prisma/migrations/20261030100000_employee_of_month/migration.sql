-- CreateTable
CREATE TABLE "EmployeeOfMonth" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "note" TEXT,
    "selectedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeOfMonth_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmployeeOfMonth_userId_idx" ON "EmployeeOfMonth"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeOfMonth_groupId_month_key" ON "EmployeeOfMonth"("groupId", "month");

-- AddForeignKey
ALTER TABLE "EmployeeOfMonth" ADD CONSTRAINT "EmployeeOfMonth_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeOfMonth" ADD CONSTRAINT "EmployeeOfMonth_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
