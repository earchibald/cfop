#!/usr/bin/env bash
# Start, stop and restart a local server for this checkout.
# Usage: scripts/dev.sh <start|stop|restart|status|log|open> [--port N] [--host H] [--no-vendor]
# See the top of README.md.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STATE="$ROOT/.dev"
PORT="${PORT:-8180}"
HOST="${HOST:-127.0.0.1}"
VENDOR=1

usage() {
  sed -n '2,4p' "$0" | sed 's/^# \{0,1\}//'
  cat <<EOF

Commands:
  start     Fetch vendor/ if needed, then serve this checkout in the background.
  stop      Stop the server this script started.
  restart   stop, then start (with the same or new options).
  status    Say whether it runs, and where.
  log       Follow the server's log (Ctrl+C to leave).
  open      Open the onboarding preview (/?onboard) in the default browser.

Options:
  --port N     Port to listen on (default 8180, or \$PORT).
  --host H     Address to bind (default 127.0.0.1; 0.0.0.0 for a phone on the same Wi-Fi).
  --no-vendor  Do not run scripts/vendor.js first.
EOF
}

cmd="${1:-}"; [ $# -gt 0 ] && shift
while [ $# -gt 0 ]; do
  case "$1" in
    --port) PORT="$2"; shift 2 ;;
    --port=*) PORT="${1#*=}"; shift ;;
    --host) HOST="$2"; shift 2 ;;
    --host=*) HOST="${1#*=}"; shift ;;
    --no-vendor) VENDOR=0; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage >&2; exit 2 ;;
  esac
done

mkdir -p "$STATE"
PIDF="$STATE/server.pid"
LOG="$STATE/server.log"
INFO="$STATE/server.info"

running() { [ -f "$PIDF" ] && kill -0 "$(cat "$PIDF")" 2>/dev/null; }
url() { local h="$HOST"; [ "$h" = "0.0.0.0" ] && h="localhost"; echo "http://$h:$PORT/"; }

start() {
  if running; then echo "Already running: $(cat "$INFO")"; return 0; fi
  if lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "Port $PORT is in use by another program. Pick one with --port N." >&2; exit 1
  fi
  if [ "$VENDOR" = 1 ]; then
    node "$ROOT/scripts/vendor.js" || echo "vendor: not fetched; scrambles use random moves"
  fi
  nohup python3 "$ROOT/scripts/dev-server.py" --port "$PORT" --host "$HOST" --root "$ROOT" >"$LOG" 2>&1 &
  echo $! >"$PIDF"
  sleep 0.5
  if ! running; then echo "The server did not start. Log:" >&2; cat "$LOG" >&2; exit 1; fi
  echo "$(url) (pid $(cat "$PIDF"), $ROOT)" >"$INFO"
  echo "Serving $ROOT"
  echo "  Site:        $(url)"
  echo "  Onboarding:  $(url)?onboard   (a first visit every load; saved history untouched)"
}

stop() {
  if running; then
    kill "$(cat "$PIDF")" && echo "Stopped $(cat "$INFO" 2>/dev/null || echo server)"
  else
    echo "Not running."
  fi
  rm -f "$PIDF" "$INFO"
}

case "$cmd" in
  start) start ;;
  stop) stop ;;
  restart) stop; start ;;
  status) if running; then echo "Running: $(cat "$INFO")"; else echo "Not running."; fi ;;
  log) touch "$LOG"; tail -f "$LOG" ;;
  open) open "$(url)?onboard" ;;
  ""|-h|--help|help) usage ;;
  *) echo "Unknown command: $cmd" >&2; usage >&2; exit 2 ;;
esac
