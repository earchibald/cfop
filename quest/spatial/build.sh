#!/bin/bash
# Build Twistwright for Meta Quest, the Spatial SDK app: the Quest page as a panel in the room, the
# cube drawn by the app beside it in passthrough, the voice through the headset's own speech
# service, the cube over the headset's Bluetooth. See docs/quest-cube-lab.md.
#
#   quest/spatial/build.sh                  build app/build/outputs/apk/debug/app-debug.apk
#   quest/spatial/build.sh --install        build, install on the headset over adb and open it
#   quest/spatial/build.sh --open           open the installed app
#   quest/spatial/build.sh --logs           the app's log lines and the page's console, as they come
#
# Needs a JDK 17 (brew install openjdk@17) and the Android SDK with platform 34 and build-tools
# 34.0.0 (brew install --cask android-commandlinetools, then
# sdkmanager "platforms;android-34" "build-tools;34.0.0"). Gradle comes through the wrapper, the
# Spatial SDK from Maven Central: the first build needs the network. The pages are this checkout as
# it is now, with vendor/ (scripts/vendor.js). With more than one adb device, set ANDROID_SERIAL.
set -euo pipefail
cd "$(dirname "$0")"
ROOT="$(cd ../.. && pwd)"
PKG=com.twistwright.quest
APK=app/build/outputs/apk/debug/app-debug.apk

INSTALL=0; OPEN=0; LOGS=0
while [ $# -gt 0 ]; do
  case "$1" in
    --install) INSTALL=1;;
    --open) OPEN=1;;
    --logs) LOGS=1;;
    *) echo "unknown option $1" >&2; exit 2;;
  esac
  shift
done

# The same headset over USB and over Wi-Fi shows as two devices: when every device has one serial,
# use the USB one (else the first).
one_headset() {
  local ids serials pick
  ids=$(adb devices | awk 'NR>1 && $2=="device" {print $1}')
  [ -n "$ids" ] || return 1
  serials=$(for d in $ids; do adb -s "$d" shell getprop ro.serialno 2>/dev/null | tr -d '\r'; echo; done | grep -v '^$' | sort -u)
  [ "$(printf '%s\n' "$serials" | wc -l | tr -d ' ')" = 1 ] || return 1
  pick=$(printf '%s\n' $ids | grep -v ':' | head -1); [ -n "$pick" ] || pick=$(printf '%s\n' $ids | head -1)
  export ANDROID_SERIAL="$pick"
  echo "The headset is on adb twice (USB and Wi-Fi): using $pick."
}
headset() {
  command -v adb >/dev/null 2>&1 || { echo "adb is not installed. Install it with: brew install --cask android-platform-tools" >&2; exit 1; }
  local st; st=$(adb get-state 2>&1 || true)
  case "$st" in
    device) ;;
    *unauthorized*) echo "The headset has not allowed this Mac yet. Put it on and choose Allow in the USB debugging prompt, then run this again." >&2; exit 1;;
    *"more than one"*) one_headset || { echo "More than one device is connected. Set ANDROID_SERIAL to the headset's serial from: adb devices" >&2; exit 1; };;
    *) echo "No headset found. Plug it in with a USB-C data cable, put it on, and allow USB debugging. adb said: $st" >&2; exit 1;;
  esac
}
open_app() {
  adb shell am start -n "$PKG/.QuestActivity" >/dev/null
  echo "Opened Twistwright Cube Lab on the headset. Put on the headset."
}
if [ "$LOGS" = 1 ]; then headset; exec adb logcat -s Twistwright:V chromium:W; fi
if [ "$OPEN" = 1 ] && [ "$INSTALL" = 0 ]; then headset; open_app; exit 0; fi

# ----- The tools -----
SDK=""
for d in "${ANDROID_HOME:-}" "${ANDROID_SDK_ROOT:-}" /opt/homebrew/share/android-commandlinetools /usr/local/share/android-commandlinetools "$HOME/Library/Android/sdk"; do
  if [ -n "$d" ] && [ -f "$d/platforms/android-34/android.jar" ]; then SDK="$d"; break; fi
done
[ -n "$SDK" ] || { echo "No Android SDK with android-34. Install it with: sdkmanager \"platforms;android-34\" \"build-tools;34.0.0\"" >&2; exit 1; }
# /usr/bin/javac is a stub on a Mac with no JDK, so look for a real one.
if [ -z "${JAVA_HOME:-}" ] || [ ! -x "$JAVA_HOME/bin/javac" ]; then
  JAVA_HOME=""
  for j in /opt/homebrew/opt/openjdk@17 /usr/local/opt/openjdk@17 "$(/usr/libexec/java_home -v 17 2>/dev/null || true)"; do
    if [ -n "$j" ] && [ -x "$j/bin/javac" ]; then JAVA_HOME="$j"; break; fi
  done
fi
[ -n "$JAVA_HOME" ] || { echo "No JDK 17 found. Install one with: brew install openjdk@17" >&2; exit 1; }
export JAVA_HOME ANDROID_HOME="$SDK" PATH="$JAVA_HOME/bin:$PATH"

# ----- The pages -----
# As quest/android/build.sh puts them: the site, the lab and the Quest page, with shim.js first in
# every page's head (Pages.java). quest/voice/ (the Quest Browser's Vosk model) stays out: the app
# hears through the headset's own speech service.
SITE=app/build/site-assets
rm -rf "$SITE"; mkdir -p "$SITE/site"
( cd "$ROOT" && node scripts/vendor.js ) || echo "vendor/ is not there: scrambles in the app are random moves."
for p in index.html css js assets lab quest onboard THIRD-PARTY.md vendor; do
  if [ -e "$ROOT/$p" ]; then cp -R "$ROOT/$p" "$SITE/site/"; fi
done
rm -rf "$SITE/site/quest/android" "$SITE/site/quest/spatial" "$SITE/site/quest/run.sh" "$SITE/site/quest/voice" "$SITE/site/lab/run.sh"
find "$SITE" -name .DS_Store -delete
cp ../android/shim.js "$SITE/shim.js"

./gradlew --quiet assembleDebug
VERSION=$(sed -n 's/.*versionName = "\([^"]*\)".*/\1/p' app/build.gradle.kts)
echo "Built $(pwd)/$APK (version $VERSION, $(du -h "$APK" | cut -f1 | tr -d ' '))"

if [ "$INSTALL" = 1 ]; then
  headset
  echo "Headset: $(adb shell getprop ro.product.model 2>/dev/null | tr -d '\r') ($(adb get-serialno))"
  adb install -r "$APK"
  open_app
fi
