#!/bin/sh
# Build the spike in mac/spike/build/TwistwrightSpike.app. See mac/spike/README.md.
#
#   mac/spike/build.sh             sign ad hoc, for this Mac only
#   mac/spike/build.sh --sign ID   sign with a certificate in the keychain, for example
#                                  "Developer ID Application: Eugene Archibald (LMMVWL22J9)"
#   mac/spike/build.sh --run       open the app when the build is done
#
# The app carries the site as it is in this checkout, changes not committed too, so the spike
# tests the page you have. The probe page goes in at /spike/.
set -e
cd "$(dirname "$0")"
SIGN="-"
RUN=""
while [ $# -gt 0 ]; do
  case "$1" in
    --sign) shift; SIGN="$1";;
    --run) RUN=1;;
    *) echo "unknown option $1" >&2; exit 2;;
  esac
  shift
done
APP=build/TwistwrightSpike.app
ROOT="$APP/Contents/Resources/root"
rm -rf build; mkdir -p "$APP/Contents/MacOS" "$ROOT"
swiftc -O -swift-version 5 Sources/*.swift -o "$APP/Contents/MacOS/TwistwrightSpike"
cp Info.plist "$APP/Contents/Info.plist"
printf 'APPL????' > "$APP/Contents/PkgInfo"
# The libraries the page loads at run time. Without them the cubing.js test fails and says so.
( cd ../.. && node scripts/vendor.js ) || echo "vendor/ not fetched: the cubing.js test will fail" >&2
for p in index.html css js assets lab THIRD-PARTY.md vendor; do
  if [ -e "../../$p" ]; then cp -R "../../$p" "$ROOT/"; fi
done
rm -f "$ROOT/lab/run.sh"
cp -R probe "$ROOT/spike"
if [ "$SIGN" = "-" ]; then codesign --force --options runtime --entitlements Spike.entitlements --sign - "$APP"
else codesign --force --options runtime --timestamp --entitlements Spike.entitlements --sign "$SIGN" "$APP"; fi
codesign --verify --strict "$APP"
echo "Built $(pwd)/$APP"
echo "Run it with its output in this terminal: $(pwd)/$APP/Contents/MacOS/TwistwrightSpike"
if [ -n "$RUN" ]; then open "$APP"; fi
