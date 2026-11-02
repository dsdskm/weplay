#!/usr/bin/env bash
# 데모 데이터 스크립트 공통 (직접 실행하지 않고 source 해서 사용)

DB_CONTAINER="weplay-db"
DB_USER="kkh"
DB_NAME="weplay"

db_require_container() {
  if ! docker ps --format '{{.Names}}' | grep -qx "$DB_CONTAINER"; then
    echo "$DB_CONTAINER 컨테이너가 실행 중이 아닙니다. ./scripts/db-start.sh 를 먼저 실행하세요." >&2
    exit 1
  fi
}

# 인자는 psql 옵션 그대로 전달
db_psql() {
  docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 "$@"
}

# SQL에 직접 넣으므로 영문 소문자·숫자만 허용
db_validate_id() {
  if ! [[ "$1" =~ ^[a-z0-9]+$ ]]; then
    echo "ID 형식이 올바르지 않습니다: $1" >&2
    exit 1
  fi
}

db_latest_group_id() {
  db_psql -tA -c "SELECT id FROM \"Group\" WHERE \"deletedAt\" IS NULL ORDER BY \"createdAt\" DESC LIMIT 1"
}

db_group_exists() {
  [ "$(db_psql -tA -c "SELECT count(*) FROM \"Group\" WHERE id = '$1' AND \"deletedAt\" IS NULL")" = "1" ]
}

# 비밀번호 해시 (bcrypt, apps/server 의 bcryptjs 사용)
db_hash_password() {
  local root
  root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
  (cd "$root/apps/server" && node -p "require('bcryptjs').hashSync('$1', 10)")
}

# 랜덤 8자리 대문자 코드 (가입 코드)
db_random_code() {
  openssl rand -hex 4 | tr 'a-f' 'A-F'
}
