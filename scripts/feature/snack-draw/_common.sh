#!/usr/bin/env bash
# 간식 쏘기 스크립트 공통 설정 (직접 실행하지 않고 source 해서 사용)

source "$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)/_lib/db.sh"

FEATURE_KEY="SNACK_DRAW"
FEATURE_LABEL="간식 쏘기"
