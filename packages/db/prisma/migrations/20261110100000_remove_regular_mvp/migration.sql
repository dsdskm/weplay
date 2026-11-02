-- 단골 선정 배지 삭제 (이달의 사원 배지에 횟수 표시로 대체)
DELETE FROM "GroupBadgeRule" WHERE "key" = 'REGULAR_MVP';
DELETE FROM "BadgeDefault" WHERE "key" = 'REGULAR_MVP';
