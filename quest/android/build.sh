#!/bin/bash
# Build Twistwright for Meta Quest: an Android app with the pages in a WebView and the cube over
# Android Bluetooth (see MainActivity.java). No Gradle and no Android Studio: the SDK's own tools
# (aapt2, d8, zipalign, apksigner) and a JDK, as mac/build.sh uses swiftc.
#
#   quest/android/build.sh                  build quest/android/build/twistwright-quest.apk
#   quest/android/build.sh --install        build, install on the headset over adb and open it
#   quest/android/build.sh --open [PAGE]    open the installed app, on PAGE (lab/, quest/, app/) if given
#   quest/android/build.sh --logs           the app's log lines and the pages' console, as they come
#
# Needs a JDK 17 (brew install openjdk@17) and the Android SDK with platform 34 and build-tools
# 34.0.0 (brew install --cask android-commandlinetools, then
# sdkmanager "platforms;android-34" "build-tools;34.0.0"). The pages are this checkout as it is now,
# with vendor/ (scripts/vendor.js). The app is signed with the debug key in ~/.android, made here
# the first time. With more than one adb device, set ANDROID_SERIAL.
set -euo pipefail
cd "$(dirname "$0")"
ROOT="$(cd ../.. && pwd)"
PKG=com.twistwright.quest
PLATFORM=android-34
BUILD_TOOLS=34.0.0
OUT=build
APK="$OUT/twistwright-quest.apk"

INSTALL=0; OPEN=0; PAGE=""; LOGS=0
while [ $# -gt 0 ]; do
  case "$1" in
    --install) INSTALL=1;;
    --open) OPEN=1; if [ $# -gt 1 ] && [ "${2#--}" = "$2" ]; then PAGE="$2"; shift; fi;;
    --logs) LOGS=1;;
    *) echo "unknown option $1" >&2; exit 2;;
  esac
  shift
done

headset() {
  command -v adb >/dev/null 2>&1 || { echo "adb is not installed. Install it with: brew install --cask android-platform-tools" >&2; exit 1; }
  local st; st=$(adb get-state 2>&1 || true)
  case "$st" in
    device) ;;
    *unauthorized*) echo "The headset has not allowed this Mac yet. Put it on and choose Allow in the USB debugging prompt, then run this again." >&2; exit 1;;
    *"more than one"*) echo "More than one device is connected. Set ANDROID_SERIAL to the headset's serial from: adb devices" >&2; exit 1;;
    *) echo "No headset found. Plug it in with a USB-C data cable, put it on, and allow USB debugging. adb said: $st" >&2; exit 1;;
  esac
}
open_app() {
  if [ -n "$PAGE" ]; then adb shell am start -n "$PKG/.MainActivity" -e page "$PAGE" >/dev/null
  else adb shell am start -n "$PKG/.MainActivity" >/dev/null; fi
  echo "Opened Twistwright Cube Lab on the headset${PAGE:+ at $PAGE}. Put on the headset."
}
if [ "$LOGS" = 1 ]; then headset; exec adb logcat -s Twistwright:V chromium:W; fi
if [ "$OPEN" = 1 ] && [ "$INSTALL" = 0 ]; then headset; open_app; exit 0; fi

# ----- The tools -----
SDK=""
for d in "${ANDROID_HOME:-}" "${ANDROID_SDK_ROOT:-}" /opt/homebrew/share/android-commandlinetools /usr/local/share/android-commandlinetools "$HOME/Library/Android/sdk"; do
  if [ -n "$d" ] && [ -f "$d/platforms/$PLATFORM/android.jar" ]; then SDK="$d"; break; fi
done
JAR="$SDK/platforms/$PLATFORM/android.jar"
BT="$SDK/build-tools/$BUILD_TOOLS"
if [ -z "$SDK" ] || [ ! -x "$BT/aapt2" ]; then
  echo "No Android SDK with $PLATFORM and build-tools $BUILD_TOOLS. Install them with:" >&2
  echo "  brew install --cask android-commandlinetools" >&2
  echo "  sdkmanager \"platforms;$PLATFORM\" \"build-tools;$BUILD_TOOLS\"" >&2
  exit 1
fi
# /usr/bin/javac is a stub on a Mac with no JDK, so look for a real one.
if [ -z "${JAVA_HOME:-}" ] || [ ! -x "$JAVA_HOME/bin/javac" ]; then
  JAVA_HOME=""
  for j in /opt/homebrew/opt/openjdk@17 /opt/homebrew/opt/openjdk /usr/local/opt/openjdk@17 "$(/usr/libexec/java_home -v 17 2>/dev/null || true)"; do
    if [ -n "$j" ] && [ -x "$j/bin/javac" ]; then JAVA_HOME="$j"; break; fi
  done
fi
[ -n "$JAVA_HOME" ] || { echo "No JDK found. Install one with: brew install openjdk@17" >&2; exit 1; }
export JAVA_HOME PATH="$JAVA_HOME/bin:$PATH"

# ----- The pages -----
rm -rf "$OUT"
mkdir -p "$OUT/assets/site" "$OUT/classes" "$OUT/dex"
( cd "$ROOT" && node scripts/vendor.js ) || echo "vendor/ is not there: scrambles in the app are random moves."
for p in index.html css js assets lab quest onboard THIRD-PARTY.md vendor; do
  if [ -e "$ROOT/$p" ]; then cp -R "$ROOT/$p" "$OUT/assets/site/"; fi
done
rm -rf "$OUT/assets/site/quest/android" "$OUT/assets/site/quest/run.sh" "$OUT/assets/site/lab/run.sh"
find "$OUT/assets" -name .DS_Store -delete
cp -R app "$OUT/assets/site/app"
cp shim.js "$OUT/assets/shim.js"

# ----- The code and the package -----
# Java 8 class files with android.jar as the boot class path (and the lambda stubs of the build
# tools); d8 turns them into one dex.
javac -nowarn -Xlint:-options -source 8 -target 8 -bootclasspath "$JAR" -classpath "$BT/core-lambda-stubs.jar" -d "$OUT/classes" src/com/twistwright/quest/*.java
"$BT/d8" --release --min-api 29 --lib "$JAR" --output "$OUT/dex" $(find "$OUT/classes" -name '*.class')
"$BT/aapt2" link -o "$OUT/unsigned.apk" -I "$JAR" --manifest AndroidManifest.xml
# The dex and the pages go in with zip: aapt2 would leave out files whose names start with a dot or _.
( cd "$OUT/dex" && zip -q -j ../unsigned.apk classes.dex )
( cd "$OUT" && zip -q -r unsigned.apk assets )
"$BT/zipalign" -f -p 4 "$OUT/unsigned.apk" "$OUT/aligned.apk"
KS="$HOME/.android/debug.keystore"
if [ ! -f "$KS" ]; then
  mkdir -p "$HOME/.android"
  keytool -genkeypair -keystore "$KS" -storepass android -keypass android -alias androiddebugkey \
    -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Android Debug,O=Android,C=US" >/dev/null 2>&1
  echo "Made the debug signing key: $KS"
fi
"$BT/apksigner" sign --ks "$KS" --ks-pass pass:android --key-pass pass:android --ks-key-alias androiddebugkey --out "$APK" "$OUT/aligned.apk"
rm -f "$OUT/unsigned.apk" "$OUT/aligned.apk" "$APK.idsig"
VERSION=$(sed -n 's/.*android:versionName="\([^"]*\)".*/\1/p' AndroidManifest.xml)
echo "Built $(pwd)/$APK (version $VERSION, $(du -h "$APK" | cut -f1 | tr -d ' '))"

if [ "$INSTALL" = 1 ]; then
  headset
  echo "Headset: $(adb shell getprop ro.product.model 2>/dev/null | tr -d '\r') ($(adb get-serialno))"
  adb install -r "$APK"
  open_app
fi
