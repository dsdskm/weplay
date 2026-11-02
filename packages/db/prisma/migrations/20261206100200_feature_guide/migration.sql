-- 기능 소개 팝업 내용
ALTER TABLE "FeatureConfig" ADD COLUMN "guideSummary" TEXT;
ALTER TABLE "FeatureConfig" ADD COLUMN "guideBody" TEXT;
ALTER TABLE "FeatureConfig" ADD COLUMN "guideImages" JSONB;
