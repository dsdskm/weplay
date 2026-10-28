#!/usr/bin/env bash
set -euo pipefail

# 사용법: ./scripts/db-backup.sh
# scripts/db/<YYYYMMDDHHMMSS>.sql 로 전체 백업을 만듭니다.

CONTAINER_NAME="weplay-db"
DB_USER="kkh"
DB_NAME="${DB_NAME:-weplay}"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP_DIR="$ROOT/scripts/db"
mkdir -p "$BACKUP_DIR"

if ! docker ps --format '{{.Names}}' | grep -qx "$CONTAINER_NAME"; then
  echo "$CONTAINER_NAME 컨테이너가 실행 중이 아닙니다. ./scripts/db-start.sh 를 먼저 실행하세요." >&2
  exit 1
fi

NAME="$(date +%Y%m%d%H%M%S)"
FILE="$BACKUP_DIR/$NAME.sql"

docker exec "$CONTAINER_NAME" pg_dump -U "$DB_USER" -d "$DB_NAME" --no-owner --no-privileges > "$FILE"

echo "백업 완료: $FILE ($(wc -c < "$FILE" | tr -d ' ') bytes)"
