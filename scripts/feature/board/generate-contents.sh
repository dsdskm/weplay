#!/usr/bin/env bash
set -euo pipefail

# 사용법: ./scripts/feature/board/generate-contents.sh [groupId]
#   groupId 생략 시 가장 최근에 만든 그룹
# 자유 게시판 샘플 데이터 생성: 그룹 게시판 글 8개와 팀별 글(팀당 2개), 댓글을 만듭니다. 실행할수록 쌓입니다.
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

CREATE TEMP TABLE _bp AS
SELECT gen_random_uuid()::text AS id, b.team, a.id AS author, b.title, b.body, random() < 0.15 AS anon, b.pin
FROM (
  SELECT NULL::text AS team, t.title, t.body, t.n = 1 AS pin
  FROM (VALUES
    (1, '📌 게시판 이용 안내', '서로 존중하는 말투로 자유롭게 이야기해요. 불편한 글은 관리자에게 알려 주세요.'),
    (2, '점심 맛집 추천해주세요', '회사 근처에 새로 생긴 곳 가보신 분 있나요?'),
    (3, '이번 주 금요일 번개 어때요?', '퇴근 후 가볍게 한잔 하실 분 댓글 남겨주세요 🍻'),
    (4, '재택 꿀팁 공유', '집중 잘 되는 노하우 있으면 알려주세요.'),
    (5, '책 추천 받아요', '요즘 읽을 만한 책 있을까요?'),
    (6, '사무실 에어컨 너무 추워요', '혹시 저만 그런가요? 😂'),
    (7, '주말에 다녀온 곳', '근교 드라이브 코스 추천합니다. 사진은 다음에 올릴게요!'),
    (8, '스터디 같이 하실 분', '주 1회 가볍게 모여서 공부해요.')
  ) AS t(n, title, body)
  UNION ALL
  SELECT tm.id, '팀 공지·잡담 ' || g.n, '우리 팀 이야기를 편하게 남겨 주세요. (' || tm.name || ')', false
  FROM (SELECT id, name FROM "Team" WHERE "groupId" = :'gid' AND "deletedAt" IS NULL ORDER BY "createdAt" LIMIT 5) tm
  CROSS JOIN generate_series(1, 2) AS g(n)
) b
CROSS JOIN LATERAL (SELECT id FROM _m WHERE b.title IS NOT NULL ORDER BY random() LIMIT 1) a;

INSERT INTO "BoardPost" (id, "groupId", "teamId", "authorId", title, body, anonymous, pinned, "createdAt", "updatedAt")
SELECT id, :'gid', team, author, title, body, anon, pin, now() - random() * interval '5 days', now() FROM _bp;

INSERT INTO "BoardComment" (id, "postId", "authorId", body, "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id, m.id,
       (ARRAY['좋은 글 감사해요!','저도 궁금했어요 🙋','공감합니다 👍','참여할게요!','ㅋㅋㅋ 맞아요','다음에 같이 가요~'])[1 + floor(random() * 6)::int],
       now() - random() * interval '4 days', now()
FROM _bp p
CROSS JOIN generate_series(1, 4) AS k(n)
CROSS JOIN LATERAL (SELECT id FROM _m WHERE p.id IS NOT NULL AND k.n > 0 ORDER BY random() LIMIT 1) m
WHERE random() < 0.6;

COMMIT;
SQL

db_psql -tA -v gid="$GROUP_ID" <<'SQL'
SELECT '게시글 ' || count(*) FROM "BoardPost" WHERE "groupId" = :'gid'; SELECT '댓글 ' || count(*) FROM "BoardComment" c JOIN "BoardPost" p ON p.id = c."postId" WHERE p."groupId" = :'gid';
SQL
echo "생성 완료: 그룹 $GROUP_ID ($FEATURE_LABEL)"
