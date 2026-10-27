-- 활성 회사 이름 중복 금지 (soft delete 된 회사의 이름은 재사용 가능)
CREATE UNIQUE INDEX "Company_name_key" ON "Company"("name") WHERE "deletedAt" IS NULL;

-- 같은 회사 내 활성 팀 이름 중복 금지
CREATE UNIQUE INDEX "Group_companyId_name_key" ON "Group"("companyId", "name") WHERE "deletedAt" IS NULL;
