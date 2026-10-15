#!/bin/sh
# Build Twistwright.app in mac/build and sign it. Then zip it for a GitHub release.
#
#   mac/build.sh                 sign with the Developer ID certificate in the keychain
#   mac/build.sh --adhoc         sign ad hoc, for a build that stays on this Mac
#   mac/build.sh --notarize P    also notarize with the notarytool keychain profile P and staple
#
# Install the app with: open mac/build/Twistwright.app, or drag it to Applications.
set -e
cd "$(dirname "$0")"
SIGN="Developer ID Application: Eugene Archibald (LMMVWL22J9)"
NOTARIZE=""
while [ $# -gt 0 ]; do
  case "$1" in
    --adhoc) SIGN="-";;
    --notarize) shift; NOTARIZE="$1";;
    *) echo "unknown option $1" >&2; exit 2;;
  esac
  shift
done
APP=build/Twistwright.app
rm -rf build; mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"
swiftc -O -swift-version 5 Sources/*.swift -o "$APP/Contents/MacOS/Twistwright"
cp Info.plist "$APP/Contents/Info.plist"
printf 'APPL????' > "$APP/Contents/PkgInfo"
if [ "$SIGN" = "-" ]; then codesign --force --sign - "$APP"
else codesign --force --options runtime --timestamp --sign "$SIGN" "$APP"; fi
zip_it() { rm -f build/Twistwright-mac.zip; ditto -c -k --keepParent "$APP" build/Twistwright-mac.zip; }
zip_it
if [ -n "$NOTARIZE" ]; then
  xcrun notarytool submit build/Twistwright-mac.zip --keychain-profile "$NOTARIZE" --wait
  xcrun stapler staple "$APP"
  zip_it
fi
codesign --verify --deep --strict "$APP"
echo "Built $(pwd)/$APP and build/Twistwright-mac.zip"
