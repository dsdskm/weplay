#!/usr/bin/env bash
set -euo pipefail

# 사용법: ./scripts/feature/suggestion-box/generate-contents.sh [groupId]
#   groupId 생략 시 가장 최근에 만든 그룹
# 건의사항 샘플 데이터 생성: 건의 14개(상태 5종 골고루, 익명 일부)와 공감 투표, 관리자 답변을 만듭니다. 실행할수록 쌓입니다.
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
WITH base AS (SELECT gen_random_uuid()::text AS id, n AS rn FROM generate_series(1, 14) n)
INSERT INTO "Suggestion" (id, "groupId", "teamId", "authorId", anonymous, category, title, body, status, answer, "answeredById", "answeredAt", "createdAt", "updatedAt")
SELECT b.id, :'gid', NULL,
  (SELECT id FROM _m ORDER BY random() LIMIT 1),
  random() < 0.2,
  (ARRAY['WORK', 'WELFARE', 'SYSTEM', 'FACILITY', 'ETC'])[1 + floor(random() * 5)::int],
  (ARRAY['점심 시간을 조금 더 길게', '회의실 예약 시스템 개선', '재택 근무 요일 자율화', '탕비실 간식 다양화', '주차 공간 부족 문제', '야근 식대 지원 확대', '온라인 회의 배경 가이드', '정기 건강검진 항목 추가', '사내 도서 구입 지원', '사무실 조명 밝기 개선', '출퇴근 셔틀 노선 추가', '연차 사용 촉진 캠페인', '팀 회고 주기 정하기', '신입 온보딩 체크리스트'])[b.rn],
  '실제로 불편했던 점을 정리했어요. 다들 공감해 주시면 검토해 볼게요.',
  CASE b.rn % 5 WHEN 0 THEN 'RECEIVED' WHEN 1 THEN 'REVIEWING' WHEN 2 THEN 'ACCEPTED' WHEN 3 THEN 'DONE' ELSE 'DECLINED' END,
  CASE WHEN b.rn % 5 = 0 THEN NULL ELSE (ARRAY['검토했어요. 다음 분기에 반영할게요.', '좋은 의견이에요! 담당 팀과 이야기해 볼게요.', '반영 완료했어요. 감사합니다!', '지금은 예산상 보류해요. 다음에 다시 봐요.'])[1 + (b.rn % 4)] END,
  CASE WHEN b.rn % 5 = 0 THEN NULL ELSE (SELECT id FROM _m ORDER BY random() LIMIT 1) END,
  CASE WHEN b.rn % 5 = 0 THEN NULL ELSE now() - (b.rn * interval '6 hours') END,
  now() - (b.rn * interval '1 day'), now()
FROM base b;

INSERT INTO "SuggestionVote" ("suggestionId", "userId", "createdAt")
SELECT s.id, m.id, now() - random() * interval '5 days'
FROM "Suggestion" s
JOIN _m m ON random() < 0.35
WHERE s."groupId" = :'gid'
ON CONFLICT DO NOTHING;

COMMIT;
SQL

db_psql -tA -v gid="$GROUP_ID" <<'SQL'
SELECT '건의 ' || count(*) FROM "Suggestion" WHERE "groupId" = :'gid'; SELECT '공감 ' || count(*) FROM "SuggestionVote" v JOIN "Suggestion" s ON s.id = v."suggestionId" WHERE s."groupId" = :'gid';
SQL
echo "생성 완료: 그룹 $GROUP_ID ($FEATURE_LABEL)"
