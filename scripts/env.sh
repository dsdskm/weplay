#!/usr/bin/env bash
set -euo pipefail

# 사용법: ./scripts/env.sh zip | unzip
# zip   : 프로젝트의 .env 파일들을 env.zip 으로 압축
# unzip : env.zip 을 임시 폴더에 풀고, 같은 상대 경로의 .env 파일들을 덮어쓰기

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ZIP_FILE="$ROOT/env.zip"

cd "$ROOT"

list_env_files() {
  find . \( -name node_modules -o -name .git -o -name .turbo -o -name dist -o -name .next \) -prune \
    -o -type f \( -name ".env" -o -name ".env.*" \) ! -name "*.example" -print \
    | sed 's|^\./||' | sort
}

do_zip() {
  local files=()
  while IFS= read -r f; do files+=("$f"); done < <(list_env_files)

  if [ ${#files[@]} -eq 0 ]; then
    echo "압축할 .env 파일이 없습니다." >&2
    exit 1
  fi

  rm -f "$ZIP_FILE"
  zip -q "$ZIP_FILE" "${files[@]}"
  echo "env.zip 생성 (${#files[@]}개)"
  printf '  %s\n' "${files[@]}"
}

do_unzip() {
  if [ ! -f "$ZIP_FILE" ]; then
    echo "env.zip 이 없습니다." >&2
    exit 1
  fi

  local tmp count=0 f rel
  tmp="$(mktemp -d)"
  trap 'rm -rf "$tmp"' EXIT

  unzip -q "$ZIP_FILE" -d "$tmp"

  while IFS= read -r f; do
    rel="${f#"$tmp"/}"
    case "$rel" in
      /*|../*|*/../*|..) echo "잘못된 경로 무시: $rel" >&2; continue ;;
    esac
    mkdir -p "$(dirname "$ROOT/$rel")"
    cp "$f" "$ROOT/$rel"
    echo "  $rel"
    count=$((count + 1))
  done < <(find "$tmp" -type f)

  echo ".env 업데이트 완료 (${count}개)"
}

case "${1:-}" in
  zip) do_zip ;;
  unzip) do_unzip ;;
  *) echo "사용법: ./scripts/env.sh zip | unzip" >&2; exit 1 ;;
esac
