#!/usr/bin/env bash
set -euo pipefail

# 사용법: ./scripts/feature/generate.sh [groupId]
#   groupId 생략 시 가장 최근에 만든 그룹
# 모든 기능(이달의 사원, 칭찬 카드, 포인트·배지, 마니또, 롤링페이퍼, 사진 미션, 회식 투표, 랜덤 설문, 간식 쏘기, 자유 게시판, 미니게임, 공통 업무, 건의사항)을 승인 상태로 만듭니다. 개발용이라 MASTER 승인을 건너뜁니다.
# 기능별로 따로 하려면 각 폴더의 generate-feature.sh 를 사용하세요.

DIR="$(cd "$(dirname "$0")" && pwd)"
source "$DIR/../_lib/db.sh"

db_require_container

GROUP_ID="${1:-$(db_latest_group_id)}"
db_validate_id "$GROUP_ID"
if ! db_group_exists "$GROUP_ID"; then
  echo "그룹을 찾을 수 없습니다: $GROUP_ID" >&2
  exit 1
fi

db_psql -q -v gid="$GROUP_ID" <<'SQL'
INSERT INTO "GroupFeature" (id, "groupId", feature, status, "requestedById", "reviewedById", "reviewedAt", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, g.id, f.feature::"FeatureKey", 'APPROVED', g."createdById", g."createdById", now(), now(), now()
FROM "Group" g
CROSS JOIN (VALUES ('EMPLOYEE_OF_THE_MONTH'), ('COMPLIMENT_CARD'), ('POINTS_BADGE'), ('MANITTO'), ('ROLLING_PAPER'), ('PHOTO_MISSION'), ('DINNER_VOTE'), ('RANDOM_SURVEY'), ('SNACK_DRAW'), ('BOARD'), ('MINI_GAMES'), ('DUTY_ROSTER'), ('SUGGESTION_BOX')) AS f(feature)
WHERE g.id = :'gid'
ON CONFLICT ("groupId", feature) DO UPDATE SET status = 'APPROVED', "reviewedAt" = now(), "rejectReason" = NULL, "updatedAt" = now();
SQL

echo "기능 승인 완료: 그룹 $GROUP_ID (이달의 사원, 칭찬 카드, 포인트·배지, 마니또, 롤링페이퍼, 사진 미션, 회식 투표, 랜덤 설문, 간식 쏘기, 자유 게시판, 미니게임, 공통 업무, 건의사항)"
