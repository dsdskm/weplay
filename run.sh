#!/usr/bin/env bash
set -euo pipefail

# 사용법: ./run.sh
# DB 컨테이너 기동 → DB 준비 대기 → 마이그레이션 → 전체 서비스(server, system-web, user-web) dev 실행

ROOT="$(cd "$(dirname "$0")" && pwd)"
CONTAINER_NAME="weplay-db"
DB_USER="kkh"
DB_NAME="weplay"

cd "$ROOT"

"$ROOT/scripts/db-start.sh"

echo "DB 준비 대기 중..."
for _ in $(seq 1 30); do
  if docker exec "$CONTAINER_NAME" pg_isready -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done
docker exec "$CONTAINER_NAME" pg_isready -U "$DB_USER" -d "$DB_NAME" >/dev/null

pnpm db:deploy
pnpm exec turbo run dev --ui=stream
