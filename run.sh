#!/usr/bin/env bash
set -euo pipefail

# 사용법: ./run.sh
# 전체 서비스(server, system-web, user-web) dev 실행
# DB 기동/마이그레이션은 하지 않음 (DB는 scripts/db-start.sh 로 별도 기동)

ROOT="$(cd "$(dirname "$0")" && pwd)"

cd "$ROOT"

pnpm exec turbo run dev --ui=stream
