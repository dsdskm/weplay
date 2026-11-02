-- 기능 기본 탑재 여부
ALTER TABLE "FeatureConfig" ADD COLUMN "isDefault" BOOLEAN NOT NULL DEFAULT false;
