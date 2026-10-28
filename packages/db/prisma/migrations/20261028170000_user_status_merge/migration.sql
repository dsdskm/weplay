-- 계정 상태 정리: SUSPENDED를 DEACTIVATED로 통합
ALTER TYPE "UserStatus" RENAME TO "UserStatus_old";
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'DEACTIVATED');
ALTER TABLE "User" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "status" TYPE "UserStatus" USING (
  CASE WHEN "status"::text = 'SUSPENDED' THEN 'DEACTIVATED' ELSE "status"::text END
)::"UserStatus";
ALTER TABLE "User" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
DROP TYPE "UserStatus_old";
