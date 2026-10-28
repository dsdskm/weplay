#!/usr/bin/env bash
set -euo pipefail

CONTAINER_NAME="weplay-db"
IMAGE="postgres:18"
DB_USER="kkh"
DB_NAME="weplay"
DB_PORT="5432"

if ! docker info >/dev/null 2>&1; then
  echo "Docker가 실행 중이 아닙니다. Docker Desktop을 먼저 실행하세요." >&2
  exit 1
fi

if docker ps -a --format '{{.Names}}' | grep -qx "$CONTAINER_NAME"; then
  if docker ps --format '{{.Names}}' | grep -qx "$CONTAINER_NAME"; then
    echo "$CONTAINER_NAME 컨테이너가 이미 실행 중입니다."
  else
    docker start "$CONTAINER_NAME" >/dev/null
    echo "$CONTAINER_NAME 컨테이너를 시작했습니다."
  fi
else
  docker run -d \
    --name "$CONTAINER_NAME" \
    -e POSTGRES_USER="$DB_USER" \
    -e POSTGRES_DB="$DB_NAME" \
    -e POSTGRES_HOST_AUTH_METHOD=trust \
    -p "$DB_PORT:5432" \
    "$IMAGE" >/dev/null
  echo "$CONTAINER_NAME 컨테이너를 생성했습니다 (localhost:$DB_PORT)."
fi
