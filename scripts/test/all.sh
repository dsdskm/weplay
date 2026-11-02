#!/usr/bin/env bash
set -euo pipefail

# 전체 테스트 실행
#   1) 타입체크 (모든 패키지)
#   2) 단위 테스트 (packages/shared/test: 게임 점수·순위·주기·콘텐츠 은행·설정 보정)
#   3) API 스모크 (서버가 켜져 있을 때만: 주요 화면 API 상태·권한)
#   4) 백업·복원 왕복 (--db 옵션일 때만: 임시 DB 로 실행, 개발 DB 는 건드리지 않음)
# 사용법: ./scripts/test/all.sh [--db]

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

step() { echo; echo "== $1"; }

step "1. 타입체크"
pnpm -r run typecheck

step "2. 단위 테스트 (shared)"
pnpm --filter @weplay/shared test

step "3. API 스모크"
API="${WEPLAY_API:-http://localhost:4000/api/v1}"
if curl -s -m3 -o /dev/null "$API/me"; then
  node scripts/test/api-smoke.mjs
else
  echo "건너뜀: 서버가 꺼져 있어요. pnpm dev 로 켠 뒤 다시 실행하세요."
fi

step "4. 백업·복원 왕복"
if [ "${1:-}" = "--db" ]; then
  ./scripts/test/backup-restore.sh
else
  echo "건너뜀: ./scripts/test/all.sh --db 로 실행하면 실행합니다."
fi

echo
echo "전체 테스트 끝"
