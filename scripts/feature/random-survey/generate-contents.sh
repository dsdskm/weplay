#!/usr/bin/env bash
set -euo pipefail

# 사용법: ./scripts/feature/random-survey/generate-contents.sh [groupId]
#   groupId 생략 시 가장 최근에 만든 그룹
# 랜덤 설문 샘플 데이터 생성: 설문 4개(진행·종료·시작 예정·승인 대기)와 응답을 만듭니다. 실행할수록 쌓입니다.
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
SELECT set_config('weplay.gid', :'gid', false);
DO $$
DECLARE
  gid text := current_setting('weplay.gid');
  members text[];
  sid text; q1 text; q2 text; q3 text; q4 text; u text;
  spec record;
BEGIN
  SELECT array_agg(gm."userId") INTO members
  FROM "GroupMembership" gm JOIN "User" us ON us.id = gm."userId"
  WHERE gm."groupId" = gid AND gm.status = 'APPROVED' AND us.status = 'ACTIVE';

  FOR spec IN
    SELECT * FROM (VALUES
      (1, '점심 메뉴 취향 조사', 'ACTIVE', 'MANUAL'),
      (2, '사내 복지 만족도', 'CLOSED', 'MANUAL'),
      (3, '다음 워크숍 장소', 'QUEUED', 'RANDOM'),
      (4, '휴게 공간 개선 아이디어', 'PENDING', 'MANUAL')
    ) AS t(n, title, status, mode)
  LOOP
    sid := gen_random_uuid()::text; q1 := gen_random_uuid()::text; q2 := gen_random_uuid()::text; q3 := gen_random_uuid()::text; q4 := gen_random_uuid()::text;
    INSERT INTO "Survey" (id, "groupId", "authorId", title, description, anonymous, "launchMode", status, "launchAt", "endsAt", "startedAt", "closedAt", "createdAt")
    VALUES (sid, gid, members[1 + floor(random() * array_length(members, 1))::int], spec.title, '가볍게 참여해 주세요 🙂', true, spec.mode, spec.status,
            CASE WHEN spec.status = 'QUEUED' THEN now() + interval '1 day' END,
            CASE WHEN spec.status = 'ACTIVE' THEN now() + interval '1 day' WHEN spec.status = 'CLOSED' THEN now() - interval '1 day' END,
            CASE WHEN spec.status IN ('ACTIVE', 'CLOSED') THEN now() - interval '2 days' END,
            CASE WHEN spec.status = 'CLOSED' THEN now() - interval '1 day' END,
            now() - interval '3 days');
    INSERT INTO "SurveyQuestion" (id, "surveyId", position, text, type, options) VALUES
      (q1, sid, 1, '가장 마음에 드는 항목은?', 'SINGLE', '["A안","B안","C안"]'::jsonb),
      (q2, sid, 2, '해당되는 것을 모두 고르세요', 'MULTI', '["가","나","다","라"]'::jsonb),
      (q3, sid, 3, '전반적인 만족도는?', 'RATING', NULL),
      (q4, sid, 4, '자유롭게 의견을 남겨 주세요', 'TEXT', NULL);
    IF spec.status IN ('ACTIVE', 'CLOSED') THEN
      FOREACH u IN ARRAY members LOOP
        IF random() < 0.75 THEN
          INSERT INTO "SurveyResponse" (id, "surveyId", "userId", answers, "createdAt")
          VALUES (gen_random_uuid()::text, sid, u, jsonb_build_object(
            q1, (ARRAY['A안','B안','C안'])[1 + floor(random() * 3)::int],
            q2, to_jsonb((SELECT array_agg(o) FROM unnest(ARRAY['가','나','다','라']) o WHERE random() < 0.5 OR o = '가')),
            q3, 1 + floor(random() * 5)::int,
            q4, (ARRAY['좋아요!','더 다양했으면 좋겠어요','지금도 충분해요','자주 해주세요'])[1 + floor(random() * 4)::int]
          ), now() - random() * interval '2 days');
        END IF;
      END LOOP;
    END IF;
  END LOOP;
END $$;
SQL

db_psql -tA -v gid="$GROUP_ID" <<'SQL'
SELECT '설문 ' || count(*) FROM "Survey" WHERE "groupId" = :'gid'; SELECT '응답 ' || count(*) FROM "SurveyResponse" r JOIN "Survey" s ON s.id = r."surveyId" WHERE s."groupId" = :'gid';
SQL
echo "생성 완료: 그룹 $GROUP_ID ($FEATURE_LABEL)"
