#!/usr/bin/env bash
set -euo pipefail

# 사용법: ./scripts/feature/photo-mission/generate-contents.sh [groupId]
#   groupId 생략 시 가장 최근에 만든 그룹
# 사진·영상 미션 샘플 데이터 생성: 사진 미션 3개(종료 1·진행 2)와 제출물을 만듭니다. 사진은 외부 샘플 이미지 주소를 씁니다. 실행할수록 쌓입니다.
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

CREATE TEMP TABLE _mi AS
SELECT gen_random_uuid()::text AS id, t.id AS host,
       (ARRAY['오늘의 점심 한 컷 🍱','내 책상 위 풍경 🖥️','퇴근길 하늘 🌇'])[row_number() OVER ()::int] AS theme,
       row_number() OVER () AS rn
FROM (SELECT id FROM _m ORDER BY random() LIMIT 3) t;

INSERT INTO "PhotoMission" (id, "groupId", "hostId", theme, description, status, deadline, "closedAt", "createdAt")
SELECT id, :'gid', host, theme, '주제에 어울리는 사진을 올려 주세요. 가장 마음에 드는 컷을 뽑을게요!',
       CASE WHEN rn = 1 THEN 'CLOSED' ELSE 'OPEN' END,
       CASE WHEN rn = 1 THEN now() - interval '1 day' ELSE now() + interval '2 days' END,
       CASE WHEN rn = 1 THEN now() - interval '1 day' END,
       now() - interval '3 days'
FROM _mi;

INSERT INTO "PhotoSubmission" (id, "missionId", "authorId", "mediaUrl", "mediaType", caption, "isBest", "createdAt")
SELECT gen_random_uuid()::text, mi.id, m.id,
       'https://picsum.photos/seed/' || substr(md5(random()::text), 1, 8) || '/640/480', 'IMAGE',
       (ARRAY['이 정도면 괜찮죠?','오늘의 한 컷!','찍는 데 한참 걸렸어요 📷','저의 최선입니다 😎',''])[1 + floor(random() * 5)::int],
       false, now() - random() * interval '2 days'
FROM _mi mi
JOIN LATERAL (SELECT id FROM _m WHERE id <> mi.host ORDER BY random() LIMIT (3 + floor(random() * 4)::int)) m ON true;

-- 종료된 미션은 제출물 중 하나를 베스트 컷으로
UPDATE "PhotoSubmission" SET "isBest" = true
WHERE id = (SELECT s.id FROM "PhotoSubmission" s JOIN _mi mi ON mi.id = s."missionId" WHERE mi.rn = 1 ORDER BY random() LIMIT 1);

COMMIT;
SQL

db_psql -tA -v gid="$GROUP_ID" <<'SQL'
SELECT '미션 ' || count(*) FROM "PhotoMission" WHERE "groupId" = :'gid'; SELECT '제출물 ' || count(*) FROM "PhotoSubmission" s JOIN "PhotoMission" m ON m.id = s."missionId" WHERE m."groupId" = :'gid';
SQL
echo "생성 완료: 그룹 $GROUP_ID ($FEATURE_LABEL)"
