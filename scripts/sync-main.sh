#!/usr/bin/env bash
# Rebase this branch onto the latest origin/main, test, and restart the dev server.
# Usage: scripts/sync-main.sh [--no-test] [--push]
# See the top of README.md.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
TEST=1
PUSH=0
for a in "$@"; do
  case "$a" in
    --no-test) TEST=0 ;;
    --push) PUSH=1 ;;
    -h|--help) sed -n '2,4p' "$0" | sed 's/^# \{0,1\}//'
      echo "  --no-test  Skip npm test after the rebase."
      echo "  --push     Push the rebased branch (with --force-with-lease, to this branch only)."
      exit 0 ;;
    *) echo "Unknown option: $a" >&2; exit 2 ;;
  esac
done

branch="$(git rev-parse --abbrev-ref HEAD)"
if [ "$branch" = main ] || [ "$branch" = master ]; then
  echo "On $branch: this script is for the onboarding branch." >&2; exit 1
fi
if [ -n "$(git status --porcelain)" ]; then
  echo "The work tree has changes. Commit them first (a WIP commit is fine)." >&2
  git status --short >&2; exit 1
fi

git fetch origin main
behind="$(git rev-list --count HEAD..origin/main)"
if [ "$behind" = 0 ]; then
  echo "Already on top of origin/main."
else
  echo "origin/main is $behind commit(s) ahead. Rebasing $branch..."
  if ! git rebase origin/main; then
    echo
    echo "The rebase stopped on a conflict. Fix the files, then:"
    echo "  git add <files> && git rebase --continue    (or: git rebase --abort)"
    echo "Then run scripts/sync-main.sh again."
    exit 1
  fi
fi

[ "$TEST" = 1 ] && npm test
if [ "$PUSH" = 1 ]; then git push --force-with-lease origin "$branch"; fi
if "$ROOT/scripts/dev.sh" status | grep -q Running; then "$ROOT/scripts/dev.sh" restart; fi
