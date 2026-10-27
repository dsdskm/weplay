-- 그룹 공개/비공개, 승인 방식
CREATE TYPE "GroupVisibility" AS ENUM ('PUBLIC', 'PRIVATE');
ALTER TABLE "Group" ADD COLUMN "visibility" "GroupVisibility" NOT NULL DEFAULT 'PUBLIC',
  ADD COLUMN "requireApproval" BOOLEAN NOT NULL DEFAULT true;
