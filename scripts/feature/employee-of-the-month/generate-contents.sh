#!/usr/bin/env bash
set -euo pipefail

# 사용법: ./scripts/feature/employee-of-the-month/generate-contents.sh [groupId] [publishDay] [winnerCount] [months] [nominatorsPerMonth] [commentsPerWinner]
#   groupId 생략 시 가장 최근에 만든 그룹
#   publishDay 기본 1, winnerCount 기본 2, months 기본 3 (이번 달 포함 최근 N개월), nominatorsPerMonth 기본 8, commentsPerWinner 기본 2
# 이달의 사원 샘플 내용 생성: 공개일·선정 인원 설정, 추천 생성, 지난 달 선정, 명예의 전당 댓글
# 기능이 승인되어 있어야 합니다 (generate-feature.sh 먼저 실행).
# 여러 번 실행해도 안전합니다: 추천은 쌓이기만 하고, 선정은 달마다 winnerCount명을 넘기지 않습니다.

DIR="$(cd "$(dirname "$0")" && pwd)"
source "$DIR/_common.sh"

PUBLISH_DAY="${2:-1}"
WINNER_COUNT="${3:-2}"
MONTHS="${4:-3}"
NOMINATORS="${5:-8}"
COMMENTS="${6:-2}"
if ! [[ "$PUBLISH_DAY" =~ ^([1-9]|1[0-9]|2[0-8])$ ]]; then
  echo "publishDay는 1~28 사이여야 합니다: $PUBLISH_DAY" >&2
  exit 1
fi
if ! [[ "$MONTHS" =~ ^([1-9]|1[0-9]|2[0-4])$ ]]; then
  echo "months는 1~24 사이여야 합니다: $MONTHS" >&2
  exit 1
fi
if ! [[ "$NOMINATORS" =~ ^([1-9]|[1-4][0-9]|50)$ ]]; then
  echo "nominatorsPerMonth는 1~50 사이여야 합니다: $NOMINATORS" >&2
  exit 1
fi
if ! [[ "$WINNER_COUNT" =~ ^[1-5]$ ]]; then
  echo "winnerCount는 1~5 사이여야 합니다: $WINNER_COUNT" >&2
  exit 1
fi
if ! [[ "$COMMENTS" =~ ^([0-9]|10)$ ]]; then
  echo "commentsPerWinner는 0~10 사이여야 합니다: $COMMENTS" >&2
  exit 1
fi

eotm_require_container

GROUP_ID="${1:-$(eotm_latest_group_id)}"
eotm_validate_group_id "$GROUP_ID"
if ! eotm_group_exists "$GROUP_ID"; then
  echo "그룹을 찾을 수 없습니다: $GROUP_ID" >&2
  exit 1
fi

STATUS="$(eotm_psql -tA -c "SELECT status FROM \"GroupFeature\" WHERE \"groupId\" = '$GROUP_ID' AND feature = 'EMPLOYEE_OF_THE_MONTH'")"
if [ "$STATUS" != "APPROVED" ]; then
  echo "이달의 사원 기능이 승인되지 않았습니다. 먼저 generate-feature.sh $GROUP_ID 를 실행하세요." >&2
  exit 1
fi

MEMBER_COUNT="$(eotm_psql -tA -c "SELECT count(*) FROM \"GroupMembership\" WHERE \"groupId\" = '$GROUP_ID' AND status = 'APPROVED'")"
if [ "$MEMBER_COUNT" -lt 2 ]; then
  echo "승인된 구성원이 2명 이상인 그룹이 필요합니다 (현재 $MEMBER_COUNT명): $GROUP_ID" >&2
  exit 1
fi

eotm_psql -q -v gid="$GROUP_ID" -v pday="$PUBLISH_DAY" -v wc="$WINNER_COUNT" -v mm="$MONTHS" -v nk="$NOMINATORS" -v cc="$COMMENTS" <<'SQL'
BEGIN;

-- 1) 공개일·선정 인원 설정
INSERT INTO "EmployeeOfTheMonthSetting" ("groupId", "publishDay", "winnerCount", "updatedById", "updatedAt")
SELECT g.id, :pday, :wc, g."createdById", now()
FROM "Group" g
WHERE g.id = :'gid'
ON CONFLICT ("groupId") DO UPDATE SET "publishDay" = EXCLUDED."publishDay", "winnerCount" = EXCLUDED."winnerCount", "updatedAt" = now();

-- 2) 승인된 구성원 목록 (임시)
CREATE TEMP TABLE _eotm_members AS
SELECT gm."userId" AS id FROM "GroupMembership" gm WHERE gm."groupId" = :'gid' AND gm.status = 'APPROVED';

-- 3) 추천 생성: 대상 달마다 최대 nk명이 다른 구성원 1명씩 추천 (같은 추천자·같은 달은 기존 것 유지)
INSERT INTO "EmployeeOfTheMonthNomination" (id, "groupId", month, "nominatorId", "nomineeId", reason, "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, :'gid', to_char((now() AT TIME ZONE 'Asia/Seoul') + make_interval(months => o.off), 'YYYY-MM'),
       n.id, t.id,
       (ARRAY['협업이 좋아요', '문제 해결을 도와줬어요', '밝은 분위기를 만들어요', '꼼꼼한 리뷰가 인상적이에요', '늘 먼저 손을 내밀어요'])[1 + floor(random() * 5)::int],
       now(), now()
FROM generate_series(-(:mm - 1), 0) AS o(off)
CROSS JOIN LATERAL (SELECT id FROM _eotm_members ORDER BY random() LIMIT :nk) n
CROSS JOIN LATERAL (SELECT id FROM _eotm_members WHERE id <> n.id ORDER BY random() LIMIT 1) t
ON CONFLICT ("groupId", month, "nominatorId") DO NOTHING;

-- 4) 지난 달 선정: 달마다 추천을 많이 받은 순으로 선정 인원만큼 (이미 있는 선정을 포함해 winnerCount명을 넘지 않음)
WITH past_months AS (
  SELECT to_char((now() AT TIME ZONE 'Asia/Seoul') + make_interval(months => o.off), 'YYYY-MM') AS month
  FROM generate_series(-(:mm - 1), -1) AS o(off)
),
ranked AS (
  SELECT n.month, n."nomineeId",
         row_number() OVER (PARTITION BY n.month ORDER BY count(*) DESC, random()) AS rn
  FROM "EmployeeOfTheMonthNomination" n
  JOIN past_months pm ON pm.month = n.month
  WHERE n."groupId" = :'gid'
    AND NOT EXISTS (SELECT 1 FROM "EmployeeOfTheMonth" e
                    WHERE e."groupId" = :'gid' AND e.month = n.month AND e."userId" = n."nomineeId")
  GROUP BY n.month, n."nomineeId"
)
INSERT INTO "EmployeeOfTheMonth" (id, "groupId", month, "userId", note, "selectedById", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, :'gid', r.month, r."nomineeId", '샘플 선정 사유', g."createdById", now(), now()
FROM ranked r
JOIN "Group" g ON g.id = :'gid'
WHERE r.rn <= :wc - (SELECT count(*) FROM "EmployeeOfTheMonth" e WHERE e."groupId" = :'gid' AND e.month = r.month);

-- 5) 명예의 전당 댓글: 지난 달 선정자마다 다른 구성원이 댓글 (선정자 본인 제외, 공개된 달만)
INSERT INTO "EmployeeOfTheMonthComment" (id, "groupId", month, "targetUserId", "authorId", body, "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, :'gid', w.month, w."userId", c.id,
       (ARRAY['축하해요!', '늘 고마워요 😊', '이번 달도 멋져요', '수고 많았어요', '같이 일해서 좋아요', '다음 달도 기대할게요'])[1 + floor(random() * 6)::int],
       now() - (random() * interval '20 days'), now()
FROM "EmployeeOfTheMonth" w
CROSS JOIN LATERAL (SELECT id FROM _eotm_members WHERE id <> w."userId" ORDER BY random() LIMIT :cc) c
WHERE w."groupId" = :'gid' AND w.month < to_char(now() AT TIME ZONE 'Asia/Seoul', 'YYYY-MM');

COMMIT;

SELECT '추천 ' || count(*) || '건' FROM "EmployeeOfTheMonthNomination" WHERE "groupId" = :'gid';
SELECT '선정 ' || count(*) || '건' FROM "EmployeeOfTheMonth" WHERE "groupId" = :'gid';
SELECT '댓글 ' || count(*) || '건' FROM "EmployeeOfTheMonthComment" WHERE "groupId" = :'gid';
SELECT '공개일 매월 ' || "publishDay" || '일, 선정 매월 ' || "winnerCount" || '명' FROM "EmployeeOfTheMonthSetting" WHERE "groupId" = :'gid';
SQL

echo "내용 생성 완료: 그룹 $GROUP_ID (공개일 매월 ${PUBLISH_DAY}일, 선정 매월 ${WINNER_COUNT}명, ${MONTHS}개월, 달별 추천 최대 ${NOMINATORS}명, 선정자당 댓글 ${COMMENTS}개)"
