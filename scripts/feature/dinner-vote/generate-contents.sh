#!/usr/bin/env bash
set -euo pipefail

# 사용법: ./scripts/feature/dinner-vote/generate-contents.sh [groupId]
#   groupId 생략 시 가장 최근에 만든 그룹
# 회식 투표 샘플 데이터 생성: 서울 후보 장소 8곳(없는 것만)과 투표 1건, 구성원 약 70%의 투표를 만듭니다. 장소는 중복 없이, 투표는 실행할수록 쌓입니다.
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
if [ "$MEMBER_COUNT" -lt 3 ]; then
  echo "활성 구성원이 3명 이상인 그룹이 필요합니다 (현재 $MEMBER_COUNT명): $GROUP_ID" >&2
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

-- 후보 장소 (이름이 같으면 건너뜀)
INSERT INTO "DinnerPlace" (id, "groupId", name, address, lat, lng, category, "addedById", "createdAt")
SELECT gen_random_uuid()::text, :'gid', v.name, v.address, v.lat, v.lng, v.category, (SELECT id FROM _m ORDER BY random() LIMIT 1), now()
FROM (VALUES
  ('강남 숯불갈비', '서울 강남구 테헤란로 123', 37.4979, 127.0276, '고깃집'),
  ('을지로 노포 골뱅이', '서울 중구 을지로 15길 8', 37.5663, 126.9910, '한식'),
  ('성수 수제맥주 펍', '서울 성동구 성수이로 77', 37.5446, 127.0557, '주점'),
  ('판교 해산물 포차', '경기 성남시 분당구 판교역로 10', 37.3948, 127.1112, '해산물'),
  ('홍대 이자카야', '서울 마포구 와우산로 29길 5', 37.5563, 126.9236, '일식'),
  ('종로 삼계탕', '서울 종로구 종로 3길 12', 37.5704, 126.9822, '한식'),
  ('여의도 곱창집', '서울 영등포구 국제금융로 6길 7', 37.5219, 126.9245, '곱창'),
  ('합정 이탈리안 비스트로', '서울 마포구 양화로 45', 37.5495, 126.9139, '양식')
) AS v(name, address, lat, lng, category)
WHERE NOT EXISTS (SELECT 1 FROM "DinnerPlace" p WHERE p."groupId" = :'gid' AND p."teamId" IS NULL AND p.name = v.name);

CREATE TEMP TABLE _poll AS SELECT gen_random_uuid()::text AS id;
INSERT INTO "DinnerPoll" (id, "groupId", title, status, "closesAt", "createdById", "createdAt")
SELECT id, :'gid', to_char(now() AT TIME ZONE 'Asia/Seoul', 'FMMM') || '월 회식 투표', 'OPEN', now() + interval '2 days', (SELECT id FROM _m ORDER BY random() LIMIT 1), now() - interval '1 day' FROM _poll;

INSERT INTO "DinnerPollDate" (id, "pollId", date)
SELECT gen_random_uuid()::text, (SELECT id FROM _poll), to_char((now() AT TIME ZONE 'Asia/Seoul')::date + d, 'YYYY-MM-DD')
FROM unnest(ARRAY[5, 6, 7]) AS d;

INSERT INTO "DinnerPollPlace" (id, "pollId", "placeId")
SELECT gen_random_uuid()::text, (SELECT id FROM _poll), p.id
FROM (SELECT id FROM "DinnerPlace" WHERE "groupId" = :'gid' AND "teamId" IS NULL ORDER BY random() LIMIT 4) p;

-- 투표: 구성원 약 70%, 날짜 1~2개(복수), 장소 1개
INSERT INTO "DinnerVote" (id, "pollId", "userId", kind, "optionId", "createdAt")
SELECT gen_random_uuid()::text, (SELECT id FROM _poll), m.id, 'DATE', d.id, now() - random() * interval '20 hours'
FROM (SELECT id FROM _m WHERE random() < 0.7) m
JOIN LATERAL (SELECT id FROM "DinnerPollDate" WHERE "pollId" = (SELECT id FROM _poll) ORDER BY random() LIMIT (1 + floor(random() * 2)::int)) d ON true;

INSERT INTO "DinnerVote" (id, "pollId", "userId", kind, "optionId", "createdAt")
SELECT gen_random_uuid()::text, (SELECT id FROM _poll), v.uid, 'PLACE', pp.id, now() - random() * interval '20 hours'
FROM (SELECT DISTINCT "userId" AS uid FROM "DinnerVote" WHERE "pollId" = (SELECT id FROM _poll)) v
JOIN LATERAL (SELECT id FROM "DinnerPollPlace" WHERE "pollId" = (SELECT id FROM _poll) ORDER BY random() LIMIT 1) pp ON true;

COMMIT;
SQL

db_psql -tA -v gid="$GROUP_ID" <<'SQL'
SELECT '장소 ' || count(*) FROM "DinnerPlace" WHERE "groupId" = :'gid'; SELECT '투표 ' || count(*) FROM "DinnerPoll" WHERE "groupId" = :'gid';
SQL
echo "생성 완료: 그룹 $GROUP_ID ($FEATURE_LABEL)"
