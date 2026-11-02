#!/usr/bin/env bash
set -euo pipefail

# 백업·복원 왕복 테스트: 개발 DB 를 임시 DB(weplay_restore_test)로 복제 → 백업 → 임시 DB 를 지우고 복원 → 테이블별 행 수 비교.
# 개발 DB 는 건드리지 않습니다 (db-backup.sh / db-restore.sh 는 DB_NAME 환경변수로 임시 DB 를 대상으로 실행).
# 사용법: ./scripts/test/backup-restore.sh   (docker 의 weplay-db 컨테이너가 떠 있어야 함)

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
CONTAINER="weplay-db"
DB_USER="kkh"
SOURCE_DB="weplay"
TEST_DB="weplay_restore_test"
BACKUP_DIR="$ROOT/scripts/db"

if ! docker ps --format '{{.Names}}' | grep -qx "$CONTAINER"; then
  echo "$CONTAINER 컨테이너가 실행 중이 아닙니다. ./scripts/db-start.sh 를 먼저 실행하세요." >&2
  exit 1
fi

# 조회 전용: stdin 을 물지 않도록 -i 를 쓰지 않음 (while read 루프 안에서 호출하기 때문)
psql_in() { docker exec "$CONTAINER" psql -U "$DB_USER" -d "$1" -v ON_ERROR_STOP=1 -tA "${@:2}"; }

# 테이블별 행 수 (이름:개수 목록)
counts() {
  local db="$1"
  local tables
  tables="$(psql_in "$db" -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename")"
  while IFS= read -r t; do
    [ -z "$t" ] && continue
    echo "$t:$(psql_in "$db" -c "SELECT count(*) FROM \"$t\"")"
  done <<< "$tables"
}

cleanup() {
  docker exec -i "$CONTAINER" psql -U "$DB_USER" -d postgres -q -c "DROP DATABASE IF EXISTS $TEST_DB" >/dev/null 2>&1 || true
  [ -n "${BACKUP_NAME:-}" ] && rm -f "$BACKUP_DIR/$BACKUP_NAME.sql" "$BACKUP_DIR/$BACKUP_NAME.uploads.tar.gz"
  return 0
}
trap cleanup EXIT

echo "[1/5] 임시 DB 만들기 ($TEST_DB)"
docker exec -i "$CONTAINER" psql -U "$DB_USER" -d postgres -q -c "DROP DATABASE IF EXISTS $TEST_DB" -c "CREATE DATABASE $TEST_DB"

echo "[2/5] 개발 DB 복제 → 임시 DB"
docker exec "$CONTAINER" pg_dump -U "$DB_USER" -d "$SOURCE_DB" --no-owner --no-privileges | docker exec -i "$CONTAINER" psql -U "$DB_USER" -d "$TEST_DB" -v ON_ERROR_STOP=1 -q
BEFORE="$(counts "$TEST_DB")"

echo "[3/5] 백업 (db-backup.sh, 대상: $TEST_DB)"
OUT="$(DB_NAME="$TEST_DB" "$ROOT/scripts/db-backup.sh")"
echo "$OUT" | tail -1
BACKUP_NAME="$(echo "$OUT" | sed -n 's#.*백업 완료: .*/scripts/db/\([0-9]\{14\}\)\.sql.*#\1#p' | head -1)"
if [ -z "$BACKUP_NAME" ] || [ ! -f "$BACKUP_DIR/$BACKUP_NAME.sql" ]; then
  echo "백업 파일을 찾지 못했습니다." >&2
  exit 1
fi

echo "[4/5] 임시 DB 를 지우고 복원 (db-restore.sh)"
docker exec -i "$CONTAINER" psql -U "$DB_USER" -d "$TEST_DB" -q -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;" >/dev/null
DB_NAME="$TEST_DB" "$ROOT/scripts/db-restore.sh" "$BACKUP_NAME" | tail -1
AFTER="$(counts "$TEST_DB")"

echo "[5/5] 행 수 비교"
if [ "$BEFORE" = "$AFTER" ]; then
  echo "PASS: 테이블 $(echo "$BEFORE" | wc -l | tr -d ' ')개, 행 수가 복원 전후 모두 같아요."
else
  echo "FAIL: 복원 전후 행 수가 달라요." >&2
  diff <(echo "$BEFORE") <(echo "$AFTER") || true
  exit 1
fi
