#!/usr/bin/env bash
set -euo pipefail

# 사용법: ./scripts/feature/mini-games/generate-contents.sh [groupId]
#   groupId 생략 시 가장 최근에 만든 그룹
# 미니게임 샘플 데이터 생성: 최근 2주 동안의 미니게임 기록을 만듭니다. 팀마다 참여율, 사람마다 실력이 달라 팀 대결 차이가 보입니다. 실행할수록 쌓입니다.
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
SELECT set_config('weplay.gid', :'gid', false);
DO $$
DECLARE
  gid text := current_setting('weplay.gid');
  today date := (now() AT TIME ZONE 'Asia/Seoul')::date;
  u record; d int; g text; n int; skill float; v float; sc float;
BEGIN
  -- 팀별 참여율 30~95%, 팀 없는 사람은 50%
  CREATE TEMP TABLE _rate ON COMMIT DROP AS
  SELECT t.id AS team_id, 0.3 + random() * 0.65 AS rate FROM "Team" t WHERE t."groupId" = gid AND t."deletedAt" IS NULL;

  FOR u IN
    SELECT gm."userId" AS id, COALESCE((SELECT r.rate FROM "TeamMember" tm JOIN _rate r ON r.team_id = tm."teamId" WHERE tm."userId" = gm."userId" AND tm."groupId" = gid LIMIT 1), 0.5) AS rate
    FROM "GroupMembership" gm JOIN "User" us ON us.id = gm."userId"
    WHERE gm."groupId" = gid AND gm.status = 'APPROVED' AND us.status = 'ACTIVE'
  LOOP
    CONTINUE WHEN random() > u.rate;
    skill := random();
    FOR d IN 0..13 LOOP
      CONTINUE WHEN random() > 0.4;
      FOREACH g IN ARRAY ARRAY['TEN_SECONDS', 'REACTION', 'NUMBER_TOUCH', 'MEMORY', 'COLOR_TRAP'] LOOP
        CONTINUE WHEN random() > 0.5;
        FOR n IN 1..(1 + floor(random() * 2)::int) LOOP
          IF g = 'TEN_SECONDS' THEN
            v := round((10000 + (random() - 0.5) * 2 * (250 + (1 - skill) * 2500))::numeric, 2);
            sc := greatest(0, least(100, 100 - abs(v - 10000) / 50));
          ELSIF g = 'REACTION' THEN
            v := round((165 + (1 - skill) * 260 + random() * 110)::numeric, 2);
            sc := greatest(0, least(100, (600 - v) / 450 * 100));
          ELSIF g = 'NUMBER_TOUCH' THEN
            v := round((8500 + (1 - skill) * 16000 + random() * 5000)::numeric, 2);
            sc := greatest(0, least(100, (40000 - v) / 32000 * 100));
          ELSIF g = 'MEMORY' THEN
            v := greatest(1, round(3 + skill * 8 + random() * 3));
            sc := least(100, v * 8);
          ELSE
            v := round(9 + skill * 14 + random() * 5);
            sc := greatest(0, least(100, v / 25 * 100));
          END IF;
          INSERT INTO "GameScore" (id, "groupId", "userId", game, value, score, "playedOn", "createdAt")
          VALUES (gen_random_uuid()::text, gid, u.id, g, v, round(sc::numeric, 2), to_char(today - d, 'YYYY-MM-DD'),
                  ((today - d)::timestamp + interval '9 hours' + random() * interval '9 hours') AT TIME ZONE 'Asia/Seoul');
        END LOOP;
      END LOOP;
    END LOOP;
  END LOOP;
END $$;
-- 활성 구성원 (임시)
CREATE TEMP TABLE _m AS
SELECT gm."userId" AS id, u.name
FROM "GroupMembership" gm
JOIN "User" u ON u.id = gm."userId"
WHERE gm."groupId" = :'gid' AND gm.status = 'APPROVED' AND u.status = 'ACTIVE';

-- 오늘의 질문 (최근 5일, 구성원 70%)
INSERT INTO "DailyPick" (id, "groupId", "userId", "teamId", date, kind, "promptKey", answer, "createdAt")
SELECT gen_random_uuid()::text, :'gid', m.id, NULL,
  to_char((now() AT TIME ZONE 'Asia/Seoul')::date - g.n, 'YYYY-MM-DD'), k.kind,
  CASE WHEN k.kind = 'TELEPATHY' THEN 'T' || (1 + floor(random() * 8))::int ELSE 'B' || (1 + floor(random() * 8))::int END,
  CASE WHEN k.kind = 'TELEPATHY' THEN floor(random() * 4)::int::text ELSE (ARRAY['A', 'B'])[1 + floor(random() * 2)::int] END,
  now() - g.n * interval '1 day'
FROM _m m
CROSS JOIN generate_series(0, 4) AS g(n)
CROSS JOIN (VALUES ('TELEPATHY'), ('BALANCE')) AS k(kind)
WHERE random() < 0.7
ON CONFLICT DO NOTHING;

-- 이 물건의 주인은? (구성원 절반이 물건 사진을 올림, 한 사람당 한 장)
INSERT INTO "GamePhoto" (id, "groupId", "userId", kind, "mediaUrl", caption, "createdAt")
SELECT gen_random_uuid()::text, :'gid', m.id, 'BELONGING',
  'https://picsum.photos/seed/' || substr(md5(m.id || 'belong'), 1, 8) || '/480/480',
  (ARRAY['책상 위 텀블러', '매일 쓰는 키보드', '출근길 에코백', '회의용 노트', '고양이 방석', '사무실 화분', '커피 쿠폰 카드'])[1 + floor(random() * 7)::int],
  now() - random() * interval '10 days'
FROM _m m
WHERE random() < 0.5
  AND NOT EXISTS (SELECT 1 FROM "GamePhoto" x WHERE x."groupId" = :'gid' AND x."userId" = m.id AND x.kind = 'BELONGING');

-- TMI 퀴즈 (구성원별 1~2개)
INSERT INTO "ProfileFact" (id, "groupId", "userId", text, "createdAt")
SELECT gen_random_uuid()::text, :'gid', m.id,
  (ARRAY['커피는 하루 두 잔까지만 마셔요', '고수는 한 번도 못 먹어 봤어요', '주말마다 한강에서 달리기를 해요', '고양이 두 마리와 살고 있어요', '첫 직장은 편의점 야간 알바였어요', '엑셀 단축키를 100개 넘게 외웠어요', '점심 메뉴는 3분 안에 정해요', '예전에 마라톤 완주를 했어요', '노래방에서는 발라드만 불러요', '여행 가면 지도 없이 걸어 다녀요', '출근길엔 항상 같은 노래를 들어요', '간식은 매운 맛만 골라요'])[1 + floor(random() * 12)::int],
  now() - random() * interval '20 days'
FROM _m m
CROSS JOIN generate_series(1, 2) AS g(n)
WHERE random() < 0.6;

SQL

db_psql -tA -v gid="$GROUP_ID" <<'SQL'
SELECT '게임 기록 ' || count(*) || '판, 참여 ' || count(DISTINCT "userId") || '명' FROM "GameScore" WHERE "groupId" = :'gid';
SQL
echo "생성 완료: 그룹 $GROUP_ID ($FEATURE_LABEL)"
