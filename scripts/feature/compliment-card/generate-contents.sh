#!/usr/bin/env bash
set -euo pipefail

# 사용법: ./scripts/feature/compliment-card/generate-contents.sh [groupId] [months] [sendRate]
#   groupId 생략 시 가장 최근에 만든 그룹, months 기본 3 (최근 N개월 = N*30일), sendRate 기본 60
#   sendRate: 구성원이 하루 칭찬 한도 중 실제로 보내는 비율(%), 익명 카드는 약 20%
# 칭찬 카드 샘플 데이터 생성. 기능이 승인되어 있어야 합니다 (generate-feature.sh 먼저 실행).
# 그룹의 일별 칭찬 한도(ComplimentSetting, 기본 3)를 지키고, 이미 보낸 수도 반영합니다. 실행할수록 카드가 쌓입니다.

DIR="$(cd "$(dirname "$0")" && pwd)"
source "$DIR/_common.sh"

MONTHS="${2:-3}"
RATE="${3:-60}"
if ! [[ "$MONTHS" =~ ^([1-9]|1[0-9]|2[0-4])$ ]]; then
  echo "months는 1~24 사이여야 합니다: $MONTHS" >&2
  exit 1
fi
if ! [[ "$RATE" =~ ^([1-9]|[1-9][0-9]|100)$ ]]; then
  echo "sendRate는 1~100 사이여야 합니다: $RATE" >&2
  exit 1
fi

cc_require_container

GROUP_ID="${1:-$(cc_latest_group_id)}"
cc_validate_group_id "$GROUP_ID"
if ! cc_group_exists "$GROUP_ID"; then
  echo "그룹을 찾을 수 없습니다: $GROUP_ID" >&2
  exit 1
fi

STATUS="$(cc_psql -tA -c "SELECT status FROM \"GroupFeature\" WHERE \"groupId\" = '$GROUP_ID' AND feature = 'COMPLIMENT_CARD'")"
if [ "$STATUS" != "APPROVED" ]; then
  echo "칭찬 카드 기능이 승인되지 않았습니다. 먼저 generate-feature.sh $GROUP_ID 를 실행하세요." >&2
  exit 1
fi

MEMBER_COUNT="$(cc_psql -tA -c "SELECT count(*) FROM \"GroupMembership\" gm JOIN \"User\" u ON u.id = gm.\"userId\" WHERE gm.\"groupId\" = '$GROUP_ID' AND gm.status = 'APPROVED' AND u.status = 'ACTIVE'")"
if [ "$MEMBER_COUNT" -lt 2 ]; then
  echo "활성 구성원이 2명 이상인 그룹이 필요합니다 (현재 $MEMBER_COUNT명): $GROUP_ID" >&2
  exit 1
fi

cc_psql -q -v gid="$GROUP_ID" -v days="$((MONTHS * 30))" -v rate="$RATE" <<'SQL'
BEGIN;

-- 1) 활성 구성원 목록 (임시)
CREATE TEMP TABLE _cc_members AS
SELECT gm."userId" AS id
FROM "GroupMembership" gm
JOIN "User" u ON u.id = gm."userId"
WHERE gm."groupId" = :'gid' AND gm.status = 'APPROVED' AND u.status = 'ACTIVE';

-- 2) 칭찬 카드: 구성원별 날짜별 후보를 sendRate% 확률로 만들고, 날짜별 한도(잔여분)만큼만 채움
INSERT INTO "ComplimentCard" (id, "groupId", "senderId", "receiverId", month, body, anonymous, "createdAt")
WITH today AS (
  SELECT (now() AT TIME ZONE 'Asia/Seoul')::date AS d
),
limit_cfg AS (
  SELECT COALESCE((SELECT "dailyLimit" FROM "ComplimentSetting" WHERE "groupId" = :'gid'), 3) AS lim
),
existing AS (
  SELECT "senderId", (("createdAt" AT TIME ZONE 'Asia/Seoul')::date) AS d, count(*) AS cnt
  FROM "ComplimentCard"
  WHERE "groupId" = :'gid'
  GROUP BY "senderId", (("createdAt" AT TIME ZONE 'Asia/Seoul')::date)
),
cand AS (
  SELECT s.id AS sender,
         (t.d - off)::date AS d,
         k.slot,
         random() AS r
  FROM _cc_members s
  CROSS JOIN today t
  CROSS JOIN generate_series(0, :days - 1) AS o(off)
  CROSS JOIN generate_series(1, 10) AS k(slot)
  WHERE random() * 100 < :rate
),
ranked AS (
  SELECT c.*,
         row_number() OVER (PARTITION BY c.sender, c.d ORDER BY c.r) AS rn
  FROM cand c
),
capped AS (
  SELECT rk.*
  FROM ranked rk
  CROSS JOIN limit_cfg lc
  LEFT JOIN existing e ON e."senderId" = rk.sender AND e.d = rk.d
  WHERE rk.rn <= GREATEST(0, lc.lim - COALESCE(e.cnt, 0))
)
SELECT gen_random_uuid()::text,
       :'gid',
       cp.sender,
       (SELECT r.id FROM _cc_members r WHERE r.id <> cp.sender ORDER BY random() LIMIT 1),
       to_char(cp.d, 'YYYY-MM'),
       (ARRAY['늘 든든해요', '덕분에 일이 수월했어요', '꼼꼼한 리뷰 감사해요', '먼저 챙겨줘서 고마워요', '좋은 아이디어 감사해요',
              '발표 정말 멋졌어요', '어려운 문제를 같이 풀어줘서 고마워요', '점심 같이 해서 즐거웠어요', '문서 정리 최고예요',
              '빠른 피드백 감사합니다', '팀 분위기를 밝게 만들어줘요', '고객 응대 수고 많았어요', '야근 같이 해줘서 고마워요',
              '새로 온 동료를 잘 챙겨줘요', '회의 준비 깔끔했어요', '코드 리뷰 덕분에 배웠어요', '항상 웃는 얼굴이 좋아요',
              '마감 전에 도와줘서 살았어요', '아이디어가 번뜩이는 사람이에요', '이번 달도 수고 많았어요'])[1 + floor(random() * 20)::int],
       random() < 0.2,
       LEAST(now(), ((cp.d::timestamp + random() * interval '1 day') AT TIME ZONE 'Asia/Seoul'))
FROM capped cp;

COMMIT;

SELECT '칭찬 카드 ' || count(*) || '장 (익명 ' || count(*) FILTER (WHERE anonymous) || '장)' FROM "ComplimentCard" WHERE "groupId" = :'gid';
SQL

echo "내용 생성 완료: 그룹 $GROUP_ID (최근 ${MONTHS}개월, 발송률 ${RATE}%, 일별 한도 준수)"
