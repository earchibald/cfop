#!/bin/sh
# Put the Quest cube lab on a Meta Quest headset. The Quest Browser has no Web Bluetooth, so the
# Twistwright app for macOS reads the cube and the headset reaches the Mac through adb reverse:
# localhost:27272 on the Quest is the app's page server on this Mac, localhost:27273 its bridge.
# localhost is a secure context, so WebXR runs over plain http.
#
#   quest/run.sh              start the app on this checkout, forward the ports, open the page in the headset
#   quest/run.sh --restart    quit a running app first (passed to lab/run.sh)
#   quest/run.sh --rebuild    build the app again first (passed to lab/run.sh)
#   quest/run.sh --no-app     forward the ports and open the page only (the app already runs)
#
# Needs adb (brew install --cask android-platform-tools) and a headset in Developer Mode, plugged
# in over USB-C with USB debugging allowed, or on wireless adb. With more than one device, set
# ANDROID_SERIAL to the headset's serial (adb devices lists it).
set -e
cd "$(dirname "$0")/.."
URL=http://localhost:27272/quest/
APP=1; PASS=""
for a in "$@"; do case "$a" in --no-app) APP=0;; --restart|--rebuild) PASS="$PASS $a";; *) echo "unknown option $a" >&2; exit 2;; esac; done
if ! command -v adb >/dev/null 2>&1; then
  echo "adb is not installed. Install it with: brew install --cask android-platform-tools" >&2; exit 1
fi
STATE=$(adb get-state 2>&1 || true)
case "$STATE" in
  device) ;;
  *unauthorized*) echo "The headset has not allowed this Mac yet. Put it on and choose Allow (Always allow from this computer) in the USB debugging prompt, then run this again." >&2; exit 1;;
  *"more than one"*) echo "More than one device is connected. Set ANDROID_SERIAL to the headset's serial from: adb devices" >&2; exit 1;;
  *) echo "No headset found. Plug it in with a USB-C data cable, put it on, and allow USB debugging. adb said: $STATE" >&2; exit 1;;
esac
echo "Headset: $(adb shell getprop ro.product.model 2>/dev/null | tr -d '\r') ($(adb get-serialno))"
# The speech recognizer and model for Drill mode's voice (the Quest Browser has none): once, about 47 MB.
node scripts/quest-voice.js || echo "The speech model did not download: Drill mode works, but it does not hear case names."
# shellcheck disable=SC2086
if [ "$APP" = 1 ]; then lab/run.sh --no-open $PASS; fi
adb reverse tcp:27272 tcp:27272 >/dev/null
adb reverse tcp:27273 tcp:27273 >/dev/null
echo "Forwarded the headset's localhost:27272 (pages) and localhost:27273 (bridge) to this Mac."
# The Quest Browser is com.oculus.browser; without it, Android picks the browser.
if ! adb shell am start -a android.intent.action.VIEW -d "$URL" com.oculus.browser 2>&1 | grep -q Error; then
  echo "Opened $URL in the Quest Browser. Put on the headset."
elif adb shell am start -a android.intent.action.VIEW -d "$URL" >/dev/null 2>&1; then
  echo "Opened $URL. Put on the headset."
else
  echo "Could not open the browser. In the headset, open the Browser and go to $URL"
fi
