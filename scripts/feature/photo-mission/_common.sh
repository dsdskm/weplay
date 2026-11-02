#!/usr/bin/env bash
# 사진·영상 미션 스크립트 공통 설정 (직접 실행하지 않고 source 해서 사용)

source "$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)/_lib/db.sh"

FEATURE_KEY="PHOTO_MISSION"
FEATURE_LABEL="사진·영상 미션"
