#!/usr/bin/env bash
set -euo pipefail

# 사용법: ./scripts/db-backup.sh
# scripts/db/latest.sql 로 전체 백업을 만들고, 기존 latest.sql 은 덮어씁니다.
# 업로드 폴더(UPLOAD_DIR, 기본 apps/server/uploads)에 파일이 있으면 latest.uploads.tar.gz 로 함께 보관합니다.
# 파일 이름은 BACKUP_NAME 환경변수로 바꿀 수 있습니다 (db-restore.sh 가 복원 전 백업에 사용).
# 백업은 임시 파일에 쓴 뒤 완료되면 이름을 바꾸므로, 중간에 실패해도 깨진 백업이 남지 않습니다.

CONTAINER_NAME="weplay-db"
DB_USER="kkh"
DB_NAME="${DB_NAME:-weplay}"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP_DIR="$ROOT/scripts/db"
UPLOAD_DIR_PATH="${UPLOAD_DIR:-$ROOT/apps/server/uploads}"

mkdir -p "$BACKUP_DIR"

if ! docker ps --format '{{.Names}}' | grep -qx "$CONTAINER_NAME"; then
  echo "$CONTAINER_NAME 컨테이너가 실행 중이 아닙니다. db-start.sh 를 실행합니다."
  "$ROOT/scripts/db-start.sh"
  echo "DB 준비 대기 중..."
  for _ in $(seq 1 30); do
    if docker exec "$CONTAINER_NAME" pg_isready -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; then
      break
    fi
    sleep 1
  done
  docker exec "$CONTAINER_NAME" pg_isready -U "$DB_USER" -d "$DB_NAME" >/dev/null
fi

NAME="${BACKUP_NAME:-latest}"
FILE="$BACKUP_DIR/$NAME.sql"
TMP_FILE="$FILE.tmp"

# 실패하면 임시 파일을 지웁니다
trap 'rm -f "$TMP_FILE"' EXIT

docker exec "$CONTAINER_NAME" pg_dump -U "$DB_USER" -d "$DB_NAME" --no-owner --no-privileges > "$TMP_FILE"
mv "$TMP_FILE" "$FILE"

echo "DB 백업 완료: $FILE ($(wc -c < "$FILE" | tr -d ' ') bytes)"

if [ -d "$UPLOAD_DIR_PATH" ] && [ -n "$(ls -A "$UPLOAD_DIR_PATH" 2>/dev/null)" ]; then
  tar -czf "$BACKUP_DIR/$NAME.uploads.tar.gz" -C "$UPLOAD_DIR_PATH" .
  echo "업로드 백업 완료: $BACKUP_DIR/$NAME.uploads.tar.gz"
else
  rm -f "$BACKUP_DIR/$NAME.uploads.tar.gz"
  echo "업로드 폴더가 비어 있어 파일 백업은 건너뜁니다: $UPLOAD_DIR_PATH"
fi
