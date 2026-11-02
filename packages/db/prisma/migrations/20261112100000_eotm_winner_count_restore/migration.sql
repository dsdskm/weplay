-- 이달의 사원 선정 인원 설정 복구 (관리자가 달마다 N명 설정, 1~5명)
ALTER TABLE "EmployeeOfTheMonthSetting" ADD COLUMN "winnerCount" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "EmployeeOfTheMonthSetting" ADD CONSTRAINT "EmployeeOfTheMonthSetting_winnerCount_check" CHECK ("winnerCount" BETWEEN 1 AND 5);
