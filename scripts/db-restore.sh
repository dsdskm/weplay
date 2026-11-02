#!/usr/bin/env bash
set -euo pipefail

# 사용법:
#   ./scripts/db-restore.sh                 가장 최근 백업을 복원
#   ./scripts/db-restore.sh <이름>          해당 백업을 복원 (예: 20261028171233 또는 20261028171233.sql)
#   ./scripts/db-restore.sh --list          사용 가능한 백업 목록
#   ./scripts/db-restore.sh <이름> -y       확인 질문 없이 복원 (스크립트·CI용)
#
# 동작:
#   1) 복원 전에 현재 DB를 자동 백업합니다 (scripts/db 의 최신 파일로 남음).
#   2) public 스키마를 지우고 백업 SQL을 넣습니다.
#   3) 같은 이름의 .uploads.tar.gz 가 있으면 업로드 폴더에 풉니다. 같은 이름의 파일은 덮어쓰고, 백업에 없는 파일은 그대로 둡니다.
#   4) pnpm db:deploy 로 백업 이후의 마이그레이션을 적용합니다.
#
# 주의: 현재 DB의 모든 데이터가 백업 시점 데이터로 바뀝니다.

CONTAINER_NAME="weplay-db"
DB_USER="kkh"
DB_NAME="${DB_NAME:-weplay}"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP_DIR="$ROOT/scripts/db"
UPLOAD_DIR_PATH="${UPLOAD_DIR:-$ROOT/apps/server/uploads}"

NAME_ARG=""
ASSUME_YES=0
for arg in "$@"; do
  case "$arg" in
    --list)
      ls -1 "$BACKUP_DIR" 2>/dev/null | grep -E '^[0-9]{14}\.sql$' | sort -r || echo "백업이 없습니다: $BACKUP_DIR"
      exit 0
      ;;
    -y | --yes) ASSUME_YES=1 ;;
    -h | --help)
      sed -n '2,15p' "$0"
      exit 0
      ;;
    *) NAME_ARG="$arg" ;;
  esac
done

if ! docker ps --format '{{.Names}}' | grep -qx "$CONTAINER_NAME"; then
  echo "$CONTAINER_NAME 컨테이너가 실행 중이 아닙니다. ./scripts/db-start.sh 를 먼저 실행하세요." >&2
  exit 1
fi

# 대상 백업 고르기
if [ -n "$NAME_ARG" ]; then
  NAME="${NAME_ARG%.sql}"
  FILE="$BACKUP_DIR/$NAME.sql"
  if [ ! -f "$FILE" ]; then
    echo "백업 파일이 없습니다: $FILE" >&2
    exit 1
  fi
else
  LATEST="$(ls -1 "$BACKUP_DIR" 2>/dev/null | grep -E '^[0-9]{14}\.sql$' | sort | tail -n 1 || true)"
  if [ -z "$LATEST" ]; then
    echo "복원할 백업이 없습니다: $BACKUP_DIR" >&2
    exit 1
  fi
  NAME="${LATEST%.sql}"
  FILE="$BACKUP_DIR/$LATEST"
fi

echo "복원 대상: $FILE"
if [ -f "${FILE%.sql}.uploads.tar.gz" ]; then
  echo "함께 복원할 업로드 파일: ${FILE%.sql}.uploads.tar.gz"
fi

# 확인 질문 (터미널이 아니면 -y 가 필요)
if [ "$ASSUME_YES" -ne 1 ]; then
  if [ ! -t 0 ]; then
    echo "터미널이 아니므로 확인할 수 없습니다. 실행하려면 -y 를 붙이세요." >&2
    exit 1
  fi
  printf "현재 DB(%s)의 데이터가 모두 바뀝니다. 계속할까요? [y/N] " "$DB_NAME"
  read -r answer
  case "$answer" in
    y | Y | yes | YES) ;;
    *)
      echo "취소했습니다."
      exit 0
      ;;
  esac
fi

# 1) 복원 전 자동 백업 (실패하면 중단)
echo "복원 전 현재 DB를 백업합니다..."
DB_NAME="$DB_NAME" UPLOAD_DIR="$UPLOAD_DIR_PATH" bash "$ROOT/scripts/db-backup.sh"

# 2) DB 초기화 후 복원
echo "DB 복원 중..."
docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 -v client_min_messages=warning -q -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;" >/dev/null
docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 -q < "$FILE"

# 3) 업로드 파일 복원
UPLOADS_ARCHIVE="${FILE%.sql}.uploads.tar.gz"
if [ -f "$UPLOADS_ARCHIVE" ]; then
  mkdir -p "$UPLOAD_DIR_PATH"
  tar -xzf "$UPLOADS_ARCHIVE" -C "$UPLOAD_DIR_PATH"
  echo "업로드 복원 완료: $UPLOAD_DIR_PATH"
fi

# 4) 백업 이후 마이그레이션 적용
echo "마이그레이션 적용 중..."
(cd "$ROOT" && pnpm db:deploy)

echo "복원 완료: $NAME"
