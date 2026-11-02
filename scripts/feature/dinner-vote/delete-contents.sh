#!/usr/bin/env bash
set -euo pipefail

# 사용법: ./scripts/feature/dinner-vote/delete-contents.sh <groupId|--all> [-y]
#   --all 은 모든 그룹의 회식 투표 내용을 삭제합니다. -y 를 주면 확인을 생략합니다.
# 삭제 대상: 회식 투표 데이터와 관련 감사 로그 (기능 신청·승인·설정은 유지)

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
SELECT 'places=' || count(*) FROM "DinnerPlace" WHERE :all = 1 OR "groupId" = :'gid';
SELECT 'polls=' || count(*) FROM "DinnerPoll" WHERE :all = 1 OR "groupId" = :'gid';
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

DELETE FROM "DinnerVote" WHERE "pollId" IN (SELECT id FROM "DinnerPoll" WHERE :all = 1 OR "groupId" = :'gid');
DELETE FROM "DinnerPollDate" WHERE "pollId" IN (SELECT id FROM "DinnerPoll" WHERE :all = 1 OR "groupId" = :'gid');
DELETE FROM "DinnerPollPlace" WHERE "pollId" IN (SELECT id FROM "DinnerPoll" WHERE :all = 1 OR "groupId" = :'gid');
DELETE FROM "DinnerPoll" WHERE :all = 1 OR "groupId" = :'gid';
DELETE FROM "DinnerPlace" WHERE :all = 1 OR "groupId" = :'gid';

DELETE FROM "AuditLog"
WHERE (:all = 1 OR "groupId" = :'gid')
  AND (action LIKE 'dinner.%' OR action LIKE 'dinner_vote.%' OR "targetType" IN ('DinnerPoll', 'DinnerPlace'));

COMMIT;
SQL

echo "삭제 완료: $SCOPE_LABEL $FEATURE_LABEL"
