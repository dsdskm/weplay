#!/usr/bin/env bash
set -euo pipefail

# 사용법: ./scripts/feature/duty-roster/generate-contents.sh [groupId]
#   groupId 생략 시 가장 최근에 만든 그룹
# 공통 업무 담당 샘플 데이터 생성: 공통 업무 6개(비품·간식·커피머신·회의실·분리수거·화분)를 만들고, 최근 2주 완료 기록을 채웁니다. 실행할수록 기록이 쌓입니다.
# 기능이 승인되어 있어야 합니다 (generate-feature.sh 먼저 실행).

DIR="$(cd "$(dirname "$0")" && pwd)"
source "$DIR/_common.sh"

db_require_container

GROUP_ID="${1:-$(db_latest_group_id)}"
db_validate_id "$GROUP_ID"
if ! db_group_exists "$GROUP_ID"; then
  echo "그룹을 찾을 수 없습니다: $GROUP_ID" >&2
  exit 1
fi

STATUS="$(db_psql -tA -c "SELECT status FROM \"GroupFeature\" WHERE \"groupId\" = '$GROUP_ID' AND feature = '$FEATURE_KEY'")"
if [ "$STATUS" != "APPROVED" ]; then
  echo "$FEATURE_LABEL 기능이 승인되지 않았습니다. 먼저 generate-feature.sh $GROUP_ID 를 실행하세요." >&2
  exit 1
fi

MEMBER_COUNT="$(db_psql -tA -c "SELECT count(*) FROM \"GroupMembership\" gm JOIN \"User\" u ON u.id = gm.\"userId\" WHERE gm.\"groupId\" = '$GROUP_ID' AND gm.status = 'APPROVED' AND u.status = 'ACTIVE'")"
if [ "$MEMBER_COUNT" -lt 2 ]; then
  echo "활성 구성원이 2명 이상인 그룹이 필요합니다 (현재 $MEMBER_COUNT명): $GROUP_ID" >&2
  exit 1
fi

db_psql -q -v gid="$GROUP_ID" <<'SQL'
BEGIN;
-- 활성 구성원 (임시)
CREATE TEMP TABLE _m AS
SELECT gm."userId" AS id, u.name
FROM "GroupMembership" gm
JOIN "User" u ON u.id = gm."userId"
WHERE gm."groupId" = :'gid' AND gm.status = 'APPROVED' AND u.status = 'ACTIVE';
CREATE TEMP TABLE _d AS
SELECT gen_random_uuid()::text AS id, v.name, v.icon, v.description, v.mode, v.period
FROM (VALUES
  ('비품 담당', '📦', '사무용품 재고를 확인하고 주문해요', 'ROTATION', 'WEEKLY'),
  ('간식 담당', '🍪', '간식을 고르고 채워 둬요', 'ROTATION', 'WEEKLY'),
  ('커피머신 관리', '☕', '원두·우유를 채우고 청소해요', 'ROTATION', 'DAILY'),
  ('회의실 정리', '🪑', '회의실 정리와 화이트보드 지우기', 'ROTATION', 'DAILY'),
  ('분리수거', '♻️', '분리수거와 쓰레기 정리', 'FIXED', 'WEEKLY'),
  ('화분 물주기', '🪴', '사무실 식물에 물을 줘요', 'FIXED', 'WEEKLY')
) AS v(name, icon, description, mode, period);

INSERT INTO "Duty" (id, "groupId", "teamId", name, icon, description, mode, period, "memberIds", "anchorDate", "offset", active, "createdById", "createdAt", "updatedAt")
SELECT d.id, :'gid', NULL, d.name, d.icon, d.description, d.mode, d.period,
  CASE WHEN d.mode = 'FIXED'
    THEN (SELECT jsonb_agg(x) FROM (SELECT id AS x FROM _m ORDER BY random() LIMIT 2) s)
    ELSE (SELECT jsonb_agg(x ORDER BY random()) FROM (SELECT id AS x FROM _m) s)
  END,
  to_char((now() AT TIME ZONE 'Asia/Seoul')::date - 21, 'YYYY-MM-DD'), 0, true,
  (SELECT id FROM _m ORDER BY random() LIMIT 1), now(), now()
FROM _d d
WHERE NOT EXISTS (SELECT 1 FROM "Duty" x WHERE x."groupId" = :'gid' AND x.name = d.name);

-- 최근 2개 기간의 완료 기록 (순번 업무의 담당자는 memberIds 중 한 명)
INSERT INTO "DutyLog" (id, "dutyId", "periodKey", "userId", status, memo, "doneAt", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, d.id,
  CASE WHEN d.period = 'DAILY'
    THEN to_char((now() AT TIME ZONE 'Asia/Seoul')::date - g.n, 'YYYY-MM-DD')
    ELSE to_char(date_trunc('week', now() AT TIME ZONE 'Asia/Seoul') - (g.n * 7) * interval '1 day', 'YYYY-MM-DD')
  END,
  (SELECT x FROM jsonb_array_elements_text(d."memberIds") x ORDER BY random() LIMIT 1),
  'DONE',
  (ARRAY['A4 용지 주문 완료', '정수기 필터 교체', '회의실 정리 끝', '원두 채워 둠', '화분 물 듬뿍'])[1 + floor(random() * 5)::int],
  now() - (g.n + 1) * interval '1 day', now(), now()
FROM "Duty" d
CROSS JOIN generate_series(1, 2) AS g(n)
WHERE d."groupId" = :'gid'
ON CONFLICT ("dutyId", "periodKey") DO NOTHING;

COMMIT;
SQL

db_psql -tA -v gid="$GROUP_ID" <<'SQL'
SELECT '공통 업무 ' || count(*) FROM "Duty" WHERE "groupId" = :'gid'; SELECT '완료 기록 ' || count(*) FROM "DutyLog" l JOIN "Duty" d ON d.id = l."dutyId" WHERE d."groupId" = :'gid';
SQL
echo "생성 완료: 그룹 $GROUP_ID ($FEATURE_LABEL)"
