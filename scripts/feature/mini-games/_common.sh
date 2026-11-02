#!/usr/bin/env bash
# 미니게임 스크립트 공통 설정 (직접 실행하지 않고 source 해서 사용)

source "$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)/_lib/db.sh"

FEATURE_KEY="MINI_GAMES"
FEATURE_LABEL="미니게임"
