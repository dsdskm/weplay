#!/usr/bin/env bash
set -euo pipefail

# 사용법: ./scripts/account/generate.sh [groupId] [perTeam] [groupOnly]
#   groupId 생략 시 가장 최근 그룹, perTeam 기본 10 (팀마다 이 인원), groupOnly 기본 5 (팀 없이 그룹에만 속한 인원)
#   계정 ID: user### / user###@example.com, 비밀번호 123456, 팀마다 첫 번째 인원은 팀 ADMIN(대표)
# 그룹의 팀 목록을 기준으로 구성원을 만듭니다. 그룹·팀이 먼저 있어야 합니다 (group-team/generate.sh).

DIR="$(cd "$(dirname "$0")" && pwd)"
source "$DIR/../_lib/db.sh"

PER_TEAM="${2:-10}"
GROUP_ONLY="${3:-5}"
if ! [[ "$PER_TEAM" =~ ^([1-9]|[1-4][0-9]|50)$ ]]; then
  echo "perTeam은 1~50 사이여야 합니다: $PER_TEAM" >&2
  exit 1
fi
if ! [[ "$GROUP_ONLY" =~ ^([0-9]|[1-9][0-9]|200)$ ]]; then
  echo "groupOnly는 0~200 사이여야 합니다: $GROUP_ONLY" >&2
  exit 1
fi

db_require_container

GROUP_ID="${1:-$(db_latest_group_id)}"
db_validate_id "$GROUP_ID"
if ! db_group_exists "$GROUP_ID"; then
  echo "그룹을 찾을 수 없습니다: $GROUP_ID" >&2
  exit 1
fi

TEAM_COUNT="$(db_psql -tA -c "SELECT count(*) FROM \"Team\" WHERE \"groupId\" = '$GROUP_ID' AND \"deletedAt\" IS NULL")"
if [ "$TEAM_COUNT" -lt 1 ]; then
  echo "팀이 없습니다. 먼저 group-team/generate.sh 로 팀을 만들어 주세요." >&2
  exit 1
fi

LAST="$(db_psql -tA -c "SELECT COALESCE(MAX(substring(username from '^user([0-9]{3})$')::int), 0) FROM \"User\" WHERE username ~ '^user[0-9]{3}$'")"
HASH="$(db_hash_password 123456)"
TOTAL=$((TEAM_COUNT * PER_TEAM + GROUP_ONLY))

db_psql -q -v gid="$GROUP_ID" -v per="$PER_TEAM" -v last="$LAST" -v total="$TOTAL" -v tc="$TEAM_COUNT" -v hash="$HASH" <<'SQL'
BEGIN;

-- 팀 번호 (생성 순서대로 1..팀수)
CREATE TEMP TABLE _teams AS
SELECT id AS team_id, row_number() OVER (ORDER BY "createdAt", id) AS idx
FROM "Team" WHERE "groupId" = :'gid' AND "deletedAt" IS NULL;

-- 새 인원: 앞쪽은 팀에 배치(perTeam명씩), 뒤쪽은 팀 없이 그룹에만 속함
CREATE TEMP TABLE _new AS
SELECT gs AS n,
       gen_random_uuid()::text AS id,
       'user' || lpad((:last::int + gs)::text, 3, '0') AS username,
       (ARRAY['김민준','이서연','박지호','최하은','정도윤','강지우','조수빈','윤예준','장채원','임시우','한수아','오준서','신지민','권유진','황현우','안다은','류태윤','서소율','전민호','홍지안','고은별','문채윤','양서준','배하린','남도현','석민아','노건우','여지원','차은우','송예린','구태현','엄유나','달빛러너','커피한잔','코딩하는고양이','새벽세시','파란하늘','밤비','초록우산','라떼한잔','무지개토끼','별빛산책','모닝커피','두근두근','바다건너','고요한숲','빨간머리','딸기우유','감자칩','여름바람','회색구름'])[1 + floor(random() * 50)::int] AS name,
       CASE WHEN ((gs - 1) / :per) + 1 <= :tc THEN ((gs - 1) / :per) + 1 END AS team_idx
FROM generate_series(1, :total::int) AS gs;

-- 계정
INSERT INTO "User" (id, email, username, name, "passwordHash", "platformRole", status, "birthDate", phone, "createdAt", "updatedAt")
SELECT id, username || '@example.com', username, name, :'hash', 'USER', 'ACTIVE',
       (date '1975-01-01' + floor(random() * 10950)::int),
       '010-' || lpad(floor(random() * 10000)::int::text, 4, '0') || '-' || lpad(floor(random() * 10000)::int::text, 4, '0'),
       now(), now()
FROM _new;

-- 그룹 소속 (승인된 일반 구성원)
INSERT INTO "GroupMembership" (id, "userId", "groupId", role, status, "joinedAt", "updatedAt")
SELECT gen_random_uuid()::text, id, :'gid', 'USER', 'APPROVED', now(), now() FROM _new;

-- 팀 소속: 팀마다 첫 인원은 팀 ADMIN
INSERT INTO "TeamMember" (id, "teamId", "userId", "groupId", role, "joinedAt")
SELECT gen_random_uuid()::text, t.team_id, n.id, :'gid', CAST(CASE WHEN (n.n - 1) % :per = 0 THEN 'ADMIN' ELSE 'USER' END AS "TeamRole"), now()
FROM _new n JOIN _teams t ON t.idx = n.team_idx;

-- 팀 대표 ADMIN 지정
UPDATE "Team" t SET "primaryAdminId" = x.id
FROM (SELECT n.id, tt.team_id FROM _new n JOIN _teams tt ON tt.idx = n.team_idx WHERE (n.n - 1) % :per = 0) x
WHERE t.id = x.team_id;

COMMIT;

SELECT '생성 인원 ' || count(*) || '명 (팀 소속 ' || count(team_idx) || '명, 그룹만 ' || count(*) - count(team_idx) || '명)' FROM _new;
SQL

echo "계정 생성 완료: 그룹 $GROUP_ID (팀 ${TEAM_COUNT}개 × ${PER_TEAM}명, 그룹만 ${GROUP_ONLY}명)"
echo "  ID: user$(printf '%03d' $((LAST + 1)))~user$(printf '%03d' $((LAST + TOTAL))) / 비밀번호: 123456"
