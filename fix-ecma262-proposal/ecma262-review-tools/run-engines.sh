#!/bin/sh
# Runs one (non-module) script on every installed engine: the jsvu shells, then node, deno and bun.
#
# usage: run-engines.sh [--tz <zone>]... <script.js>
#
# Without --tz, each engine runs once with the inherited environment. Every --tz runs all engines
# again with TZ=<zone>, e.g. --tz UTC --tz Etc/GMT-1 (Etc/GMT-1 is UTC+01:00).
# Each run's output is preceded by "## <engine>" (or "## <engine> TZ=<zone>").
# The script must print with `print` when it exists, else `console.log`.
#
# env: JSVU_BIN (default ~/.jsvu/bin), RUN_ENGINES_TIMEOUT in seconds (default 30)

usage() { echo "usage: $0 [--tz <zone>]... <script.js>" >&2; exit 2; }

zones=""
script=""
while [ $# -gt 0 ]; do
  case "$1" in
    --tz) [ $# -ge 2 ] || usage; zones="$zones
$2"; shift 2 ;;
    --tz=*) zones="$zones
${1#--tz=}"; shift ;;
    -*) usage ;;
    *) [ -z "$script" ] || usage; script="$1"; shift ;;
  esac
done
[ -n "$script" ] && [ -f "$script" ] || usage

jsvu="${JSVU_BIN:-$HOME/.jsvu/bin}"
limit="${RUN_ENGINES_TIMEOUT:-30}"

run1() { # $1: engine name, $2: zone or empty, rest: command
  name="$1" zone="$2"; shift 2
  if [ -n "$zone" ]; then
    echo "## $name TZ=$zone"
    TZ="$zone" timeout "$limit" "$@" </dev/null 2>&1
  else
    echo "## $name"
    timeout "$limit" "$@" </dev/null 2>&1
  fi
}

run_all() { # $1: zone, or empty for the inherited environment
  for e in v8 sm jsc xs hermes; do
    [ -x "$jsvu/$e" ] && run1 "$e" "$1" "$jsvu/$e" "$script"
  done
  command -v node >/dev/null 2>&1 && run1 node "$1" node "$script"
  command -v deno >/dev/null 2>&1 && run1 deno "$1" deno run -q "$script"
  command -v bun >/dev/null 2>&1 && run1 bun "$1" bun "$script"
}

if [ -z "$zones" ]; then
  run_all ""
else
  printf '%s\n' "$zones" | while IFS= read -r zone; do
    [ -n "$zone" ] && run_all "$zone"
  done
fi
