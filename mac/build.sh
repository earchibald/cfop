#!/bin/sh
# Build Twistwright.app in mac/build and sign it. Then zip it for a GitHub release.
#
#   mac/build.sh                 sign with the Developer ID certificate in the keychain
#   mac/build.sh --adhoc         sign ad hoc, for a build that stays on this Mac
#   mac/build.sh --notarize P    also notarize with the notarytool keychain profile P and staple
#   mac/build.sh --site REF      build in the site as it is at the git ref REF (a tag, a branch, a
#                                commit); HEAD when not given. Changes not committed are not used
#   mac/build.sh --no-site       build no copy of the site in; the app shows twistwright.com only
#
# Install the app with: open mac/build/Twistwright.app, or drag it to Applications.
set -e
cd "$(dirname "$0")"
SIGN="Developer ID Application: Eugene Archibald (LMMVWL22J9)"
NOTARIZE=""
SITE_REF="HEAD"
while [ $# -gt 0 ]; do
  case "$1" in
    --adhoc) SIGN="-";;
    --notarize) shift; NOTARIZE="$1";;
    --site) shift; SITE_REF="$1";;
    --no-site) SITE_REF="";;
    *) echo "unknown option $1" >&2; exit 2;;
  esac
  shift
done
APP=build/Twistwright.app
rm -rf build; mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"
swiftc -O -swift-version 5 Sources/*.swift -o "$APP/Contents/MacOS/Twistwright"
cp Info.plist "$APP/Contents/Info.plist"
printf 'APPL????' > "$APP/Contents/PkgInfo"
# The icon: AppIcon.icon, the Icon Composer document that scripts/mac-icon.js writes. actool makes
# Assets.car (light, dark, tinted and clear, for macOS 26 and later) and AppIcon.icns (older systems).
xcrun actool AppIcon.icon --compile "$APP/Contents/Resources" --platform macosx --minimum-deployment-target 14.0 \
  --app-icon AppIcon --output-partial-info-plist build/icon-info.plist --errors --warnings --output-format human-readable-text >/dev/null
rm -f build/icon-info.plist
# The built-in site: the files of the page and the lab, as GitHub Pages serves them, at SITE_REF.
# site.json names the ref, the commit and APP_VERSION. It sits beside the site, so it is not served.
if [ -n "$SITE_REF" ]; then
  COMMIT=$(git rev-parse --verify --quiet "$SITE_REF^{commit}") || { echo "no git ref $SITE_REF" >&2; exit 2; }
  PATHS=""
  for p in index.html css js assets lab THIRD-PARTY.md; do
    if git cat-file -e "$COMMIT:$p" 2>/dev/null; then PATHS="$PATHS $p"; fi
  done
  mkdir -p "$APP/Contents/Resources/site"
  git -C .. archive "$COMMIT" -- $PATHS ':(exclude)lab/run.sh' | tar -x -C "$APP/Contents/Resources/site"
  # The libraries the page loads at run time, as pinned at SITE_REF. git ignores vendor/, so they
  # come from the cache in vendor/ when its pins match, else from npm (NOCACHE=1 forces npm).
  if git cat-file -e "$COMMIT:scripts/vendor.js" 2>/dev/null; then
    TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
    git show "$COMMIT:package.json" > "$TMP/package.json"; git show "$COMMIT:scripts/vendor.js" > "$TMP/vendor.js"
    VDIR="$(pwd)/../vendor"
    node "$TMP/vendor.js" --pkg "$TMP/package.json" --out "$VDIR"
    cp -R "$VDIR" "$APP/Contents/Resources/site/vendor"
  fi
  VERSION=$(git show "$COMMIT:js/version.js" | sed -n "s/^const APP_VERSION='\(.*\)';.*/\1/p")
  printf '{"ref":"%s","commit":"%s","version":"%s"}\n' "$SITE_REF" "$COMMIT" "$VERSION" > "$APP/Contents/Resources/site.json"
  echo "Built in the site at $SITE_REF ($(echo "$COMMIT" | cut -c1-7)), version ${VERSION:-unknown}"
fi
# The entitlements let the hardened runtime give the page the camera and the microphone.
if [ "$SIGN" = "-" ]; then codesign --force --options runtime --entitlements Twistwright.entitlements --sign - "$APP"
else codesign --force --options runtime --timestamp --entitlements Twistwright.entitlements --sign "$SIGN" "$APP"; fi
zip_it() { rm -f build/Twistwright-mac.zip; ditto -c -k --keepParent "$APP" build/Twistwright-mac.zip; }
zip_it
if [ -n "$NOTARIZE" ]; then
  xcrun notarytool submit build/Twistwright-mac.zip --keychain-profile "$NOTARIZE" --wait
  xcrun stapler staple "$APP"
  zip_it
fi
codesign --verify --deep --strict "$APP"
echo "Built $(pwd)/$APP and build/Twistwright-mac.zip"
