#!/bin/sh
# Tag a release of Twistwright for macOS and build it, with the site at the tagged commit built in.
# The tag is mac-vX.Y.Z after CFBundleShortVersionString in mac/Info.plist. It goes on HEAD, so
# check out the commit whose site the app is to carry first: a commit of main that is live.
#
#   mac/release.sh               sign with the Developer ID certificate in the keychain
#   mac/release.sh --notarize P  also notarize with the notarytool keychain profile P (see build.sh)
#
# The script makes the tag on this Mac only. It prints the commands that push the tag and publish
# the release on GitHub; run them when the build is checked.
set -e
cd "$(dirname "$0")/.."
NOTARIZE=""
while [ $# -gt 0 ]; do
  case "$1" in
    --notarize) shift; NOTARIZE="$1";;
    *) echo "unknown option $1" >&2; exit 2;;
  esac
  shift
done
if [ -n "$(git status --porcelain)" ]; then echo "Commit or set aside the changes first: the tag names a commit." >&2; exit 1; fi
V=$(sed -n 's|.*<key>CFBundleShortVersionString</key><string>\(.*\)</string>.*|\1|p' mac/Info.plist)
TAG="mac-v$V"
if git rev-parse -q --verify "refs/tags/$TAG" >/dev/null; then echo "$TAG is there already. Raise the version in mac/Info.plist." >&2; exit 1; fi
SITE=$(sed -n "s/^const APP_VERSION='\(.*\)';.*/\1/p" js/version.js)
git fetch -q origin main 2>/dev/null || true
if [ "$(git rev-parse HEAD)" != "$(git rev-parse origin/main 2>/dev/null)" ]; then
  echo "Note: HEAD is not origin/main. The app will carry the site at $(git rev-parse --short HEAD)."
fi
git tag -a "$TAG" -m "Twistwright for macOS $V, with the site $SITE built in"
build() { if [ -n "$NOTARIZE" ]; then mac/build.sh --site "$TAG" --notarize "$NOTARIZE"; else mac/build.sh --site "$TAG"; fi; }
build || { git tag -d "$TAG" >/dev/null; echo "The build failed, so $TAG is gone again." >&2; exit 1; }
cat <<EOF

Tagged $TAG on $(git rev-parse --short HEAD): the app $V with the site $SITE built in.
Check mac/build/Twistwright.app, then publish:

  git push origin $TAG
  gh release create $TAG mac/build/Twistwright-mac.zip --title "Twistwright for macOS $V" \\
    --notes "Built-in pages: Twistwright $SITE. The menu bar item chooses Built-in pages or Live pages from twistwright.com."

To take the tag back before a push: git tag -d $TAG
EOF
