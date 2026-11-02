-- 그룹별 저장 용량 할당
ALTER TABLE "Group" ADD COLUMN "storageQuotaMb" INTEGER NOT NULL DEFAULT 1024;
