#!/usr/bin/env bash
set -euo pipefail

# 사용법: ./scripts/feature/rolling-paper/generate-contents.sh [groupId]
#   groupId 생략 시 가장 최근에 만든 그룹
# 롤링페이퍼 샘플 데이터 생성: 롤링페이퍼 3장과 포스트잇 메시지를 만듭니다. 실행할수록 쌓입니다.
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

CREATE TEMP TABLE _p AS
SELECT gen_random_uuid()::text AS id, t.id AS target, t.name AS tname,
       (ARRAY['YELLOW','PINK','BLUE','GREEN'])[1 + floor(random() * 4)::int] AS theme,
       row_number() OVER () AS rn
FROM (SELECT id, name FROM _m ORDER BY random() LIMIT 3) t;

INSERT INTO "RollingPaper" (id, "groupId", "targetUserId", title, message, theme, status, "closedAt", "createdById", "createdAt")
SELECT p.id, :'gid', p.target, p.tname || '님을 위한 롤링페이퍼',
       (ARRAY['한 줄씩 마음을 남겨 주세요 💌', '수고 많았어요! 응원 한마디씩 🙌', '함께해서 즐거웠어요 🎉'])[p.rn::int],
       p.theme, CASE WHEN p.rn = 3 THEN 'CLOSED' ELSE 'OPEN' END,
       CASE WHEN p.rn = 3 THEN now() - interval '1 day' END,
       (SELECT id FROM _m WHERE id <> p.target ORDER BY random() LIMIT 1), now() - interval '3 days'
FROM _p p;

INSERT INTO "RollingPaperNote" (id, "paperId", "authorId", body, color, rotation, anonymous, "createdAt")
SELECT gen_random_uuid()::text, p.id, m.id,
       (ARRAY['항상 고마워요! 덕분에 든든했어요 😊','같이 일해서 즐거웠습니다 👍','늘 밝은 에너지 감사해요 ✨','다음에 맛있는 거 먹으러 가요 🍚','응원합니다! 화이팅 💪','꼼꼼하게 챙겨주셔서 감사했어요 🙏','최고예요! 🏆','건강 잘 챙기세요 🌿'])[1 + floor(random() * 8)::int],
       (ARRAY['#FFF3A3','#FFD6E0','#D6EBFF','#D9F7D2','#FFE2B8','#E6D9FF'])[1 + floor(random() * 6)::int],
       floor(random() * 9)::int - 4, random() < 0.25, now() - random() * interval '2 days'
FROM _p p
JOIN LATERAL (SELECT id FROM _m WHERE id <> p.target ORDER BY random() LIMIT (6 + floor(random() * 8)::int)) m ON true;

COMMIT;
SQL

db_psql -tA -v gid="$GROUP_ID" <<'SQL'
SELECT '롤링페이퍼 ' || count(*) FROM "RollingPaper" WHERE "groupId" = :'gid'; SELECT '포스트잇 ' || count(*) FROM "RollingPaperNote" n JOIN "RollingPaper" p ON p.id = n."paperId" WHERE p."groupId" = :'gid';
SQL
echo "생성 완료: 그룹 $GROUP_ID ($FEATURE_LABEL)"
