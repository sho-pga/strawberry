#!/usr/bin/env bash
set -euo pipefail

SRC=server/ci-server-tests-pr.yml.txt
DST=.github/workflows/ci-server-tests-pr.yml
BRANCH=${1:-chore/ci-artifacts-and-e2e}

if [ ! -f "$SRC" ]; then
  echo "Source file $SRC not found" >&2
  exit 2
fi

cp "$SRC" "$DST"

git add "$DST"
if git diff --staged --quiet; then
  echo "No changes to commit"
  exit 0
fi

git commit -m "chore(ci): update workflow from server text source"

echo "Pushing to origin/$BRANCH"
git push origin HEAD:$BRANCH

echo "Done. Workflow file updated from $SRC"
