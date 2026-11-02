#!/usr/bin/env bash
set -euo pipefail

# 사용법: ./scripts/feature/employee-of-the-month/delete-contents.sh <groupId|--all> [-y]
#   --all 은 모든 그룹의 이달의 사원 내용을 삭제합니다. -y 를 주면 확인을 생략합니다.
# 삭제 대상: 추천, 선정, 공개일·선정 인원 설정, 댓글, 관련 감사 로그 (기능 신청·승인은 유지)

DIR="$(cd "$(dirname "$0")" && pwd)"
source "$DIR/_common.sh"

TARGET="${1:-}"
CONFIRM="${2:-}"
if [ -z "$TARGET" ]; then
  echo "사용법: $0 <groupId|--all> [-y]" >&2
  exit 1
fi

eotm_require_container

if [ "$TARGET" = "--all" ]; then
  SCOPE_ALL=1
  GROUP_ID=""
  SCOPE_LABEL="모든 그룹"
else
  SCOPE_ALL=0
  GROUP_ID="$TARGET"
  eotm_validate_group_id "$GROUP_ID"
  SCOPE_LABEL="그룹 $GROUP_ID"
fi

SCOPE_ARGS=(-v all="$SCOPE_ALL" -v gid="$GROUP_ID")

echo "$SCOPE_LABEL 이달의 사원 내용:"
eotm_psql -tA "${SCOPE_ARGS[@]}" <<'SQL'
SELECT 'nominations=' || count(*) FROM "EmployeeOfTheMonthNomination" WHERE :all = 1 OR "groupId" = :'gid'
UNION ALL SELECT 'winners=' || count(*) FROM "EmployeeOfTheMonth" WHERE :all = 1 OR "groupId" = :'gid'
UNION ALL SELECT 'settings=' || count(*) FROM "EmployeeOfTheMonthSetting" WHERE :all = 1 OR "groupId" = :'gid'
UNION ALL SELECT 'comments=' || count(*) FROM "EmployeeOfTheMonthComment" WHERE :all = 1 OR "groupId" = :'gid';
SQL

if [ "$CONFIRM" != "-y" ]; then
  read -r -p "삭제할까요? (y/N) " answer
  if [ "$answer" != "y" ] && [ "$answer" != "Y" ]; then
    echo "취소했습니다."
    exit 0
  fi
fi

eotm_psql -q "${SCOPE_ARGS[@]}" <<'SQL'
BEGIN;

DELETE FROM "EmployeeOfTheMonthNomination" WHERE :all = 1 OR "groupId" = :'gid';
DELETE FROM "EmployeeOfTheMonth" WHERE :all = 1 OR "groupId" = :'gid';
DELETE FROM "EmployeeOfTheMonthSetting" WHERE :all = 1 OR "groupId" = :'gid';
DELETE FROM "EmployeeOfTheMonthComment" WHERE :all = 1 OR "groupId" = :'gid';

DELETE FROM "AuditLog"
WHERE (:all = 1 OR "groupId" = :'gid')
  AND (action LIKE 'employee_of_the_month.%' OR "targetType" LIKE 'EmployeeOfTheMonth%');

COMMIT;
SQL

echo "삭제 완료: $SCOPE_LABEL 이달의 사원 내용"
