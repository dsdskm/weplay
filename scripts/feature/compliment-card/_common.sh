#!/usr/bin/env bash
# 이달의 사원 스크립트 공통 설정 (직접 실행하지 않고 source 해서 사용)

CONTAINER_NAME="weplay-db"
DB_USER="kkh"
DB_NAME="weplay"

cc_require_container() {
  if ! docker ps --format '{{.Names}}' | grep -qx "$CONTAINER_NAME"; then
    echo "$CONTAINER_NAME 컨테이너가 실행 중이 아닙니다. ./scripts/db-start.sh 를 먼저 실행하세요." >&2
    exit 1
  fi
}

# 인자는 psql 옵션 그대로 전달 (예: -tA -c "...", -v gid=..., -q)
cc_psql() {
  docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 "$@"
}

# SQL에 직접 넣으므로 영문 소문자·숫자만 허용
cc_validate_group_id() {
  if ! [[ "$1" =~ ^[a-z0-9]+$ ]]; then
    echo "groupId 형식이 올바르지 않습니다: $1" >&2
    exit 1
  fi
}

cc_latest_group_id() {
  cc_psql -tA -c "SELECT id FROM \"Group\" WHERE \"deletedAt\" IS NULL ORDER BY \"createdAt\" DESC LIMIT 1"
}

cc_group_exists() {
  [ "$(cc_psql -tA -c "SELECT count(*) FROM \"Group\" WHERE id = '$1'")" = "1" ]
}
