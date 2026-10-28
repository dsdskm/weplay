#!/usr/bin/env bash
set -euo pipefail

# 사용법: ./scripts/kill.sh [추가 포트...]
# 기본: user-web(3000), system-web(3001), server(4000). DB(5432)는 건드리지 않습니다.
PORTS=(3000 3001 4000 "$@")

for port in "${PORTS[@]}"; do
  pids="$(lsof -nP -iTCP:"$port" -sTCP:LISTEN -t 2>/dev/null || true)"
  if [ -z "$pids" ]; then
    echo "port $port: 사용 중인 프로세스 없음"
    continue
  fi
  # shellcheck disable=SC2086
  kill $pids 2>/dev/null || true
  echo "port $port: 종료 $pids"
done
