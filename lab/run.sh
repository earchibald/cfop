#!/bin/sh
# Serve this checkout from the Twistwright app for macOS and open the smart cube lab in the
# browser. The app serves the page at http://127.0.0.1:27272/ and bridges Bluetooth to it, so
# Safari can reach a cube. The lab is at /lab/.
#
#   lab/run.sh             build the app if it is not built, start it, open the lab
#   lab/run.sh --restart   quit a running app first (one that serves twistwright.com has no /lab/)
#   lab/run.sh --rebuild   build the app again first
set -e
cd "$(dirname "$0")/.."
APP=mac/build/Twistwright.app/Contents/MacOS/Twistwright
URL=http://127.0.0.1:27272/lab/
RESTART=0; REBUILD=0
for a in "$@"; do case "$a" in --restart) RESTART=1;; --rebuild) REBUILD=1;; *) echo "unknown option $a" >&2; exit 2;; esac; done
if [ "$REBUILD" = 1 ] || [ ! -x "$APP" ]; then mac/build.sh --adhoc; fi
# An app from 0.2.0 on names its pages in /bridge/info: "site" is root for a checkout. Its built-in
# pages have a /lab/ too, so only an older app, with no "site", is judged by /lab/ alone.
if INFO=$(curl -s -m 2 http://127.0.0.1:27272/bridge/info); then
  case "$INFO" in *'"site"'*) case "$INFO" in *'"site":"root"'*) MINE=1;; *) MINE=0;; esac;;
    *) MINE=0; curl -s -m 2 -o /dev/null -w '%{http_code}' "$URL" | grep -q 200 && MINE=1;; esac
  if [ "$RESTART" = 1 ]; then pkill -x Twistwright || true; sleep 1
  elif [ "$MINE" = 1 ]; then echo "The app is already serving this checkout."; open "$URL"; exit 0
  else echo "A Twistwright app is running, but it does not serve this checkout. Quit it from the menu bar, or run lab/run.sh --restart." >&2; exit 1; fi
fi
"$APP" --root "$(pwd)" --no-open >/dev/null 2>&1 &
for i in 1 2 3 4 5 6 7 8 9 10; do curl -s -m 1 -o /dev/null http://127.0.0.1:27272/bridge/info && break; sleep 0.5; done
echo "Twistwright serves $(pwd) at http://127.0.0.1:27272/ (pid $!). Quit it from the menu bar."
open "$URL"
