#!/usr/bin/env bash
# Creates a new engine262 git worktree for an experiment and builds it, so that a shared
# baseline checkout is never edited.
#
#   new-engine262-worktree.sh <baseCheckout> <name> [ref]
#
# - creates ../<name> next to <baseCheckout>, on a new branch <name>, from [ref] (default:
#   the base checkout's HEAD);
# - symlinks node_modules to the base checkout's (resolved) node_modules;
# - copies the git-ignored generated build inputs that `build:engine` needs but that a fresh
#   worktree lacks (lib/*.json, src/data-gen.json, src/unicode/*.json);
# - runs `npm run build:engine`, logging to <name>.build.log next to the worktree.
#
# Commit experiments there as SCRATCH commits behind env switches; remove the worktree with
# `git -C <baseCheckout> worktree remove ../<name>` when done.
set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "usage: $0 <baseCheckout> <name> [ref]" >&2
  exit 2
fi
base=$(realpath "$1")
name=$2
ref=${3:-HEAD}
dest="$(dirname "$base")/$name"

if [[ -e "$dest" ]]; then
  echo "error: $dest already exists" >&2
  exit 1
fi

git -C "$base" worktree add "$dest" -b "$name" "$ref"

modules=$(realpath "$base/node_modules")
ln -s "$modules" "$dest/node_modules"

shopt -s nullglob
mkdir -p "$dest/lib" "$dest/src/unicode"
for f in "$base"/lib/*.json; do cp "$f" "$dest/lib/"; done
[[ -f "$base/src/data-gen.json" ]] && cp "$base/src/data-gen.json" "$dest/src/"
for f in "$base"/src/unicode/*.json; do cp "$f" "$dest/src/unicode/"; done

log="$dest.build.log"
if (cd "$dest" && npm run build:engine >"$log" 2>&1); then
  echo "built $dest (log: $log)"
else
  echo "error: build failed, see $log" >&2
  tail -20 "$log" >&2
  exit 1
fi
