-- 건의사항은 기본 탑재 (그룹이 신청하지 않아도 사용)
INSERT INTO "FeatureConfig" ("feature", "active", "isDefault", "updatedAt") VALUES ('SUGGESTION_BOX', true, true, now())
ON CONFLICT ("feature") DO UPDATE SET "isDefault" = true;
