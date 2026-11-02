#!/usr/bin/env bash
set -euo pipefail

# 사용법: ./scripts/feature/snack-draw/generate-contents.sh [groupId]
#   groupId 생략 시 가장 최근에 만든 그룹
# 간식 쏘기 샘플 데이터 생성: 간식 게임 3개(종료·뽑는 중·모집 중)를 만듭니다. 실행할수록 쌓입니다.
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
if [ "$MEMBER_COUNT" -lt 6 ]; then
  echo "활성 구성원이 6명 이상인 그룹이 필요합니다 (현재 $MEMBER_COUNT명): $GROUP_ID" >&2
  exit 1
fi

db_psql -q -v gid="$GROUP_ID" <<'SQL'
SELECT set_config('weplay.gid', :'gid', false);
DO $$
DECLARE
  gid text := current_setting('weplay.gid');
  members text[];
  g text; n int; i int; winners int[]; spec record; part text[]; drawn int;
BEGIN
  SELECT array_agg(gm."userId" ORDER BY random()) INTO members
  FROM "GroupMembership" gm JOIN "User" us ON us.id = gm."userId"
  WHERE gm."groupId" = gid AND gm.status = 'APPROVED' AND us.status = 'ACTIVE';

  FOR spec IN
    SELECT * FROM (VALUES
      ('금요일 커피 쏘기 ☕', 'DONE', 6, 1),
      ('오후 간식 내기 🍩', 'DRAWING', 8, 2),
      ('팀 회식 후 아이스크림 🍦', 'RECRUITING', 5, 1)
    ) AS t(title, status, cnt, win)
  LOOP
    g := gen_random_uuid()::text;
    n := LEAST(spec.cnt, array_length(members, 1));
    part := (SELECT array_agg(x) FROM (SELECT unnest(members) AS x ORDER BY random() LIMIT n) s);
    INSERT INTO "SnackGame" (id, "groupId", title, status, "winnerCount", "createdById", "createdAt", "startedAt", "doneAt")
    VALUES (g, gid, spec.title, spec.status, LEAST(spec.win, GREATEST(n - 1, 1)), part[1], now() - interval '1 day',
            CASE WHEN spec.status <> 'RECRUITING' THEN now() - interval '1 day' END,
            CASE WHEN spec.status = 'DONE' THEN now() - interval '20 hours' END);
    FOR i IN 1..n LOOP
      INSERT INTO "SnackParticipant" (id, "gameId", "userId", "joinedAt") VALUES (gen_random_uuid()::text, g, part[i], now() - interval '1 day');
    END LOOP;
    IF spec.status <> 'RECRUITING' THEN
      -- 당첨 칸을 미리 섞어 정해 둠
      winners := (SELECT array_agg(p) FROM (SELECT generate_series(1, n) AS p ORDER BY random() LIMIT LEAST(spec.win, GREATEST(n - 1, 1))) w);
      drawn := CASE WHEN spec.status = 'DONE' THEN n ELSE n / 2 END;
      FOR i IN 1..n LOOP
        INSERT INTO "SnackSlot" (id, "gameId", position, "isWinner", "drawnById", "drawnAt")
        VALUES (gen_random_uuid()::text, g, i, i = ANY(winners),
                CASE WHEN i <= drawn THEN part[i] END,
                CASE WHEN i <= drawn THEN now() - interval '19 hours' END);
      END LOOP;
    END IF;
  END LOOP;
END $$;
SQL

db_psql -tA -v gid="$GROUP_ID" <<'SQL'
SELECT '게임 ' || count(*) FROM "SnackGame" WHERE "groupId" = :'gid';
SQL
echo "생성 완료: 그룹 $GROUP_ID ($FEATURE_LABEL)"
