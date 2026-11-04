#!/usr/bin/env bash
set -euo pipefail

# 사용법: ./scripts/email/email.sh <받는사람 이메일>
# 예: ./scripts/email/email.sh dsdskm@gmail.com
# .env 의 MAIL_USER / MAIL_PASSWORD / MAIL_FROM 으로 Gmail SMTP 를 통해 랜덤 내용의 테스트 메일을 보냅니다.
# MAIL_DRIVER 값과 상관없이 발송하므로, 실제 발송 설정을 확인하는 용도로 쓸 수 있습니다.

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ENV_FILE="$ROOT/.env"

if [ $# -ne 1 ]; then
  echo "사용법: ./scripts/email/email.sh <받는사람 이메일>" >&2
  exit 1
fi

TO="$1"
if ! [[ "$TO" =~ ^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$ ]]; then
  echo "이메일 형식이 아닙니다: $TO" >&2
  exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
  echo ".env 파일이 없습니다: $ENV_FILE" >&2
  exit 1
fi

cd "$ROOT"
# Node 22 의 --env-file 로 .env 를 읽습니다 (dotenv 패키지 불필요)
node --env-file="$ENV_FILE" scripts/email/send-test.mjs "$TO"
