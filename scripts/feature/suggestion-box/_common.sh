#!/usr/bin/env bash
# 건의사항 스크립트 공통 설정 (직접 실행하지 않고 source 해서 사용)

source "$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)/_lib/db.sh"

FEATURE_KEY="SUGGESTION_BOX"
FEATURE_LABEL="건의사항"
