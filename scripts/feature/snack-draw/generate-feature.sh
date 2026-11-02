#!/usr/bin/env bash
set -euo pipefail

# 사용법: ./scripts/feature/snack-draw/generate-feature.sh [groupId]
#   groupId 생략 시 가장 최근에 만든 그룹
# 간식 쏘기 기능을 승인 상태로 만듭니다. 개발용이라 MASTER 승인 절차를 건너뜁니다.

DIR="$(cd "$(dirname "$0")" && pwd)"
source "$DIR/_common.sh"

db_require_container

GROUP_ID="${1:-$(db_latest_group_id)}"
db_validate_id "$GROUP_ID"
if ! db_group_exists "$GROUP_ID"; then
  echo "그룹을 찾을 수 없습니다: $GROUP_ID" >&2
  exit 1
fi

db_psql -q -v gid="$GROUP_ID" <<'SQL'
INSERT INTO "GroupFeature" (id, "groupId", feature, status, "requestedById", "reviewedById", "reviewedAt", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, g.id, 'SNACK_DRAW', 'APPROVED', g."createdById", g."createdById", now(), now(), now()
FROM "Group" g
WHERE g.id = :'gid'
ON CONFLICT ("groupId", feature) DO UPDATE SET status = 'APPROVED', "reviewedAt" = now(), "rejectReason" = NULL, "updatedAt" = now();
SQL

echo "기능 승인 완료: 그룹 $GROUP_ID (간식 쏘기)"
