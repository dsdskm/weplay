#!/usr/bin/env bash
set -euo pipefail

# 사용법: ./scripts/generate-all.sh
# 그룹 1개 + 팀 5개를 만들고, USER 계정 30명을 그룹/팀 소속을 섞어 생성합니다.
# 그룹 ADMIN, 팀 ADMIN, 그룹/팀 대표 ADMIN까지 지정합니다. 비밀번호는 123456입니다.
# 아이디/이메일은 user###@example.com 형식이며, 기존 번호 다음부터 이어서 만듭니다.

CONTAINER_NAME="weplay-db"
DB_USER="kkh"
DB_NAME="weplay"
PASSWORD="123456"
USER_COUNT=30
TEAM_NAMES=(팀A 팀B 팀C 팀D 팀E)
NICKS=(달빛러너 커피한잔 코딩하는고양이 새벽세시 파란하늘 밤비 초록우산 라떼한잔 무지개토끼 별빛산책 모닝커피 두근두근 바다건너 고요한숲 빨간머리 딸기우유 감자칩 여름바람 회색구름)
REALS=(김민준 이서연 박지호 최하은 정도윤 강지우 조수빈 윤예준 장채원 임시우 한수아 오준서 신지민 권유진 황현우 안다은 류태윤 서소율 전민호 홍지안 고은별 문채윤 양서준 배하린 남도현 석민아 노건우 여지원 차은우 송예린 구태현 엄유나)

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if ! docker ps --format '{{.Names}}' | grep -qx "$CONTAINER_NAME"; then
  echo "$CONTAINER_NAME 컨테이너가 실행 중이 아닙니다. ./scripts/db-start.sh 를 먼저 실행하세요." >&2
  exit 1
fi

psql_q() { docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -tA -c "$1"; }
hex() { openssl rand -hex "$1"; }

HASH="$(cd "$ROOT/apps/server" && node -p "require('bcryptjs').hashSync('$PASSWORD', 10)")"
LAST="$(psql_q "SELECT COALESCE(MAX(n), 0) FROM (
  SELECT substring(username from '^user([0-9]{3})$')::int AS n FROM \"User\" WHERE username ~ '^user[0-9]{3}$'
  UNION ALL
  SELECT substring(email from '^user([0-9]{3})@example\.com$')::int FROM \"User\" WHERE email ~ '^user[0-9]{3}@example\.com$'
) t;")"
SUFFIX="$(date +%H%M%S)"
CREATOR="(SELECT id FROM \"User\" WHERE \"platformRole\" = 'MASTER' ORDER BY \"createdAt\" LIMIT 1)"

GROUP_ID="$(hex 12)"
GROUP_NAME="데모그룹$SUFFIX"
GROUP_CODE="$(hex 4 | tr 'a-f' 'A-F')"

# 사용자 ID 배열 (인덱스 1..USER_COUNT)
declare -a UID_BY_NO
for ((i = 1; i <= USER_COUNT; i++)); do UID_BY_NO[$i]="$(hex 12)"; done

# 팀 ID 배열 (인덱스 1..5)
declare -a TEAM_ID_BY_NO
for ((t = 1; t <= ${#TEAM_NAMES[@]}; t++)); do TEAM_ID_BY_NO[$t]="$(hex 12)"; done

sql="BEGIN;"

# 사용자
for ((i = 1; i <= USER_COUNT; i++)); do
  n=$((LAST + i))
  num="$(printf '%03d' "$n")"
  id="${UID_BY_NO[$i]}"
  real="${REALS[$(( (i - 1) % ${#REALS[@]} ))]}"
  # 절반은 닉네임(실명), 나머지는 실명만
  name="$real"
  if (( i % 2 == 0 )); then name="${NICKS[$(( (i - 1) % ${#NICKS[@]} ))]}($real)"; fi
  # 랜덤 생일(1975~2004)과 전화번호
  birth="$(printf '%04d-%02d-%02d' $((1975 + RANDOM % 30)) $((1 + RANDOM % 12)) $((1 + RANDOM % 28)))"
  phone="010-$(printf '%04d' $((RANDOM % 10000)))-$(printf '%04d' $((RANDOM % 10000)))"
  sql+="INSERT INTO \"User\" (id, username, email, name, \"passwordHash\", \"platformRole\", status, \"birthDate\", phone, \"createdAt\", \"updatedAt\") VALUES ('$id', 'user$num', 'user$num@example.com', '$name', '$HASH', 'USER', 'ACTIVE', '$birth', '$phone', NOW(), NOW());"
  sql+="INSERT INTO \"AuditLog\" (id, \"actorId\", action, \"targetType\", \"targetId\", \"createdAt\") VALUES ('$(hex 12)', '$id', 'auth.signup', 'User', '$id', NOW());"
done

# 그룹 (대표 GROUP_ADMIN = 1번 사용자)
GROUP_PRIMARY="${UID_BY_NO[1]}"
sql+="INSERT INTO \"Group\" (id, name, \"joinCode\", \"joinCodeRotatedAt\", \"joinCodeEnabled\", status, \"primaryAdminId\", \"createdById\", \"createdAt\", \"updatedAt\") VALUES ('$GROUP_ID', '$GROUP_NAME', '$GROUP_CODE', NOW(), true, 'ACTIVE', '$GROUP_PRIMARY', $CREATOR, NOW(), NOW());"

# 팀 (팀 t 의 대표 TEAM_ADMIN = 4~8번 사용자 중 t번째)
for ((t = 1; t <= ${#TEAM_NAMES[@]}; t++)); do
  team_id="${TEAM_ID_BY_NO[$t]}"
  primary="${UID_BY_NO[$((3 + t))]}"
  code="$(hex 4 | tr 'a-f' 'A-F')"
  sql+="INSERT INTO \"Team\" (id, \"groupId\", name, \"joinCode\", \"joinCodeRotatedAt\", \"joinCodeEnabled\", visibility, \"requireApproval\", \"createdById\", \"createdAt\", \"updatedAt\", \"primaryAdminId\") VALUES ('$team_id', '$GROUP_ID', '${TEAM_NAMES[$((t - 1))]}', '$code', NOW(), true, 'PUBLIC', true, $CREATOR, NOW(), NOW(), '$primary');"
done

# 그룹 소속: 1~3번 GROUP_ADMIN, 나머지 1~25번 USER (26~30번은 소속 없음)
for ((i = 1; i <= 25; i++)); do
  role="USER"
  [ "$i" -le 3 ] && role="ADMIN"
  sql+="INSERT INTO \"GroupMembership\" (id, \"userId\", \"groupId\", role, status, \"joinedAt\", \"updatedAt\") VALUES ('$(hex 12)', '${UID_BY_NO[$i]}', '$GROUP_ID', '$role', 'APPROVED', NOW(), NOW());"
done

# 팀 소속
#  4~8번: 각 팀의 TEAM_ADMIN (팀 t = 4+t-1)
#  9~20번: 팀에 USER로 분산 배치
#  9번은 팀1의 추가 TEAM_ADMIN
for ((t = 1; t <= ${#TEAM_NAMES[@]}; t++)); do
  team_id="${TEAM_ID_BY_NO[$t]}"
  sql+="INSERT INTO \"TeamMember\" (id, \"teamId\", \"userId\", \"groupId\", role, \"joinedAt\") VALUES ('$(hex 12)', '$team_id', '${UID_BY_NO[$((3 + t))]}', '$GROUP_ID', 'ADMIN', NOW());"
done
sql+="INSERT INTO \"TeamMember\" (id, \"teamId\", \"userId\", \"groupId\", role, \"joinedAt\") VALUES ('$(hex 12)', '${TEAM_ID_BY_NO[1]}', '${UID_BY_NO[9]}', '$GROUP_ID', 'ADMIN', NOW());"
for ((i = 10; i <= 20; i++)); do
  t=$(( (i - 10) % ${#TEAM_NAMES[@]} + 1 ))
  sql+="INSERT INTO \"TeamMember\" (id, \"teamId\", \"userId\", \"groupId\", role, \"joinedAt\") VALUES ('$(hex 12)', '${TEAM_ID_BY_NO[$t]}', '${UID_BY_NO[$i]}', '$GROUP_ID', 'USER', NOW());"
done

sql+="COMMIT;"

printf '%s' "$sql" | docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 -q

echo "생성 완료"
echo "  그룹: $GROUP_NAME (코드 $GROUP_CODE) / 팀: ${TEAM_NAMES[*]}"
echo "  사용자: user$(printf '%03d' $((LAST + 1))) ~ user$(printf '%03d' $((LAST + USER_COUNT))) (비밀번호: $PASSWORD)"
echo "  대표 GROUP_ADMIN: 1번 사용자 / 팀별 대표 TEAM_ADMIN: 4~8번 사용자"
