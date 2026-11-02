#!/usr/bin/env bash
set -euo pipefail

# 사용법: ./scripts/feature/delete.sh <groupId|--all> [-y]
#   --all 은 모든 그룹의 기능 신청·승인 기록을 지웁니다. -y 를 주면 확인을 생략합니다.
# 삭제 대상: 모든 기능(이달의 사원, 칭찬 카드, 포인트·배지, 마니또, 활동 6종, 미니게임, 공통 업무, 건의사항)의 신청·승인 기록과 그 감사 로그
# 기능 내용(추천, 선정, 칭찬 카드, 포인트 설정)은 지우지 않습니다. 기능별로 지우려면 각 폴더의 delete-feature.sh 를 사용하세요.

DIR="$(cd "$(dirname "$0")" && pwd)"
source "$DIR/../_lib/db.sh"

TARGET="${1:-}"
CONFIRM="${2:-}"
if [ -z "$TARGET" ]; then
  echo "사용법: $0 <groupId|--all> [-y]" >&2
  exit 1
fi

db_require_container

if [ "$TARGET" = "--all" ]; then
  SCOPE_ALL=1
  GROUP_ID=""
  SCOPE_LABEL="모든 그룹"
else
  SCOPE_ALL=0
  GROUP_ID="$TARGET"
  db_validate_id "$GROUP_ID"
  SCOPE_LABEL="그룹 $GROUP_ID"
fi

echo "$SCOPE_LABEL 기능 신청·승인 기록:"
db_psql -tA -v all="$SCOPE_ALL" -v gid="$GROUP_ID" <<'SQL'
SELECT feature || '=' || count(*) FROM "GroupFeature"
WHERE :all = 1 OR "groupId" = :'gid'
GROUP BY feature ORDER BY feature;
SQL

if [ "$CONFIRM" != "-y" ]; then
  read -r -p "삭제할까요? (y/N) " answer
  if [ "$answer" != "y" ] && [ "$answer" != "Y" ]; then
    echo "취소했습니다."
    exit 0
  fi
fi

db_psql -q -v all="$SCOPE_ALL" -v gid="$GROUP_ID" <<'SQL'
BEGIN;

DELETE FROM "FeatureSetting" WHERE :all = 1 OR "groupId" = :'gid';

WITH removed AS (
  DELETE FROM "GroupFeature" WHERE :all = 1 OR "groupId" = :'gid'
  RETURNING id
)
DELETE FROM "AuditLog" WHERE "targetType" = 'GroupFeature' AND "targetId" IN (SELECT id FROM removed);

COMMIT;
SQL

echo "삭제 완료: $SCOPE_LABEL 기능 신청·승인 기록"
