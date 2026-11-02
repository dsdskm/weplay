#!/usr/bin/env bash
set -euo pipefail

# 사용법: ./scripts/group-team/generate.sh [teamCount]
#   teamCount 생략 시 5개. 데모 그룹 1개와 팀들을 만듭니다. 구성원은 ./scripts/account/generate.sh 로 추가하세요.

DIR="$(cd "$(dirname "$0")" && pwd)"
source "$DIR/../_lib/db.sh"

TEAM_COUNT="${1:-5}"
if ! [[ "$TEAM_COUNT" =~ ^([1-9]|[1-4][0-9]|50)$ ]]; then
  echo "teamCount는 1~50 사이여야 합니다: $TEAM_COUNT" >&2
  exit 1
fi

db_require_container

CREATOR="$(db_psql -tA -c "SELECT id FROM \"User\" WHERE \"platformRole\" = 'MASTER' ORDER BY \"createdAt\" LIMIT 1")"
if [ -z "$CREATOR" ]; then
  echo "MASTER 계정이 없습니다. 먼저 MASTER를 만들어 주세요." >&2
  exit 1
fi

GROUP_ID="$(openssl rand -hex 12)"
SUFFIX="$(date +%H%M%S)"
GROUP_NAME="데모그룹$SUFFIX"
GROUP_CODE="$(db_random_code)"

sql="BEGIN;
INSERT INTO \"Group\" (id, name, \"joinCode\", \"joinCodeRotatedAt\", \"joinCodeEnabled\", status, \"createdById\", \"createdAt\", \"updatedAt\")
VALUES ('$GROUP_ID', '$GROUP_NAME', '$GROUP_CODE', NOW(), true, 'ACTIVE', '$CREATOR', NOW(), NOW());"
for ((t = 1; t <= TEAM_COUNT; t++)); do
  sql+="INSERT INTO \"Team\" (id, \"groupId\", name, \"joinCode\", \"joinCodeRotatedAt\", \"joinCodeEnabled\", visibility, \"requireApproval\", \"createdById\", \"createdAt\", \"updatedAt\")
VALUES ('$(openssl rand -hex 12)', '$GROUP_ID', '데모팀 $(printf '%02d' "$t")', '$(db_random_code)', NOW(), true, 'PUBLIC', true, '$CREATOR', NOW(), NOW());"
done
sql+="COMMIT;"

printf '%s' "$sql" | db_psql -q

echo "그룹·팀 생성 완료: $GROUP_NAME (팀 ${TEAM_COUNT}개)"
echo "  그룹 ID: $GROUP_ID"
