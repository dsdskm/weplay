#!/usr/bin/env bash
set -euo pipefail

# 사용법:
#   ./scripts/db-restore.sh            scripts/db 에서 가장 최근 백업을 복원
#   ./scripts/db-restore.sh <이름>     해당 이름의 백업을 복원 (예: 20261028171233 또는 20261028171233.sql)
# 주의: 복원 전에 현재 DB의 모든 데이터를 삭제합니다.

CONTAINER_NAME="weplay-db"
DB_USER="kkh"
DB_NAME="${DB_NAME:-weplay}"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP_DIR="$ROOT/scripts/db"

if ! docker ps --format '{{.Names}}' | grep -qx "$CONTAINER_NAME"; then
  echo "$CONTAINER_NAME 컨테이너가 실행 중이 아닙니다. ./scripts/db-start.sh 를 먼저 실행하세요." >&2
  exit 1
fi

if [ "$#" -ge 1 ]; then
  NAME="${1%.sql}"
  FILE="$BACKUP_DIR/$NAME.sql"
  if [ ! -f "$FILE" ]; then
    echo "백업 파일이 없습니다: $FILE" >&2
    exit 1
  fi
else
  FILE="$(ls -1 "$BACKUP_DIR" 2>/dev/null | grep -E '^[0-9]{14}\.sql$' | sort | tail -n 1 || true)"
  if [ -z "$FILE" ]; then
    echo "복원할 백업이 없습니다: $BACKUP_DIR" >&2
    exit 1
  fi
  FILE="$BACKUP_DIR/$FILE"
fi

echo "복원 파일: $FILE"
echo "현재 DB($DB_NAME)의 모든 데이터를 삭제하고 복원합니다."

# 현재 DB 전체 삭제 (public 스키마 재생성)
docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 -q -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# 백업 복원
docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 -q < "$FILE"

echo "복원 완료: $(basename "$FILE")"
