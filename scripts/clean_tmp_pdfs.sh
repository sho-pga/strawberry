#!/usr/bin/env bash
# Safe cleanup for tmp-pdf* directories across the repo.
# Usage: ./scripts/clean_tmp_pdfs.sh [--yes]

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
shopt -s nullglob

mapfile -t DIRS < <(find "$ROOT_DIR" -maxdepth 3 -type d -name 'tmp-pdf*' 2>/dev/null)

if [ ${#DIRS[@]} -eq 0 ]; then
  echo "No tmp-pdf* directories found under $ROOT_DIR"
  exit 0
fi

echo "Found the following tmp-pdf* directories:"
for d in "${DIRS[@]}"; do
  echo "  - $d"
done

if [ "${1-}" = "--yes" ]; then
  ANSWER=y
else
  read -r -p "Delete these directories? [y/N]: " ANSWER
fi

if [[ "$ANSWER" =~ ^[Yy]$ ]]; then
  for d in "${DIRS[@]}"; do
    echo "Removing $d"
    rm -rf -- "$d"
  done
  echo "Done."
else
  echo "Aborted. Pass --yes to delete without prompting."
fi
