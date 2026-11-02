#!/usr/bin/env bash
set -euo pipefail

# 사용법: ./scripts/feature/duty-roster/delete-contents.sh <groupId|--all> [-y]
#   --all 은 모든 그룹의 공통 업무 담당 내용을 삭제합니다. -y 를 주면 확인을 생략합니다.
# 삭제 대상: 공통 업무 담당 데이터와 관련 감사 로그 (기능 신청·승인·설정은 유지)

DIR="$(cd "$(dirname "$0")" && pwd)"
source "$DIR/_common.sh"

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

SCOPE_ARGS=(-v all="$SCOPE_ALL" -v gid="$GROUP_ID")

echo "$SCOPE_LABEL $FEATURE_LABEL:"
db_psql -tA "${SCOPE_ARGS[@]}" <<'SQL'
SELECT 'duties=' || count(*) FROM "Duty" WHERE :all = 1 OR "groupId" = :'gid';
SELECT 'logs=' || count(*) FROM "DutyLog" l JOIN "Duty" d ON d.id = l."dutyId" WHERE :all = 1 OR d."groupId" = :'gid';
SQL

if [ "$CONFIRM" != "-y" ]; then
  read -r -p "삭제할까요? (y/N) " answer
  if [ "$answer" != "y" ] && [ "$answer" != "Y" ]; then
    echo "취소했습니다."
    exit 0
  fi
fi

db_psql -q "${SCOPE_ARGS[@]}" <<'SQL'
BEGIN;

DELETE FROM "DutyLog" WHERE "dutyId" IN (SELECT id FROM "Duty" WHERE :all = 1 OR "groupId" = :'gid');
DELETE FROM "Duty" WHERE :all = 1 OR "groupId" = :'gid';

DELETE FROM "AuditLog"
WHERE (:all = 1 OR "groupId" = :'gid')
  AND (action LIKE 'duty.%' OR "targetType" = 'Duty');

COMMIT;
SQL

echo "삭제 완료: $SCOPE_LABEL $FEATURE_LABEL"
