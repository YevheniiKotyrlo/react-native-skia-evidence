#!/usr/bin/env bash
# Builds the example of a react-native-skia checkout as an arm64 release APK whose bundle opens the recorder-trim probe
# (RecorderTrimProbe.tsx, copied in for the bundle only), with each patch named applied for the build only, and copies
# it beside this script. The checkout is at the commit under test, with its dependencies and Skia's binaries installed.
#   bash build-probe.sh <checkout> [<patch>...]
set -euo pipefail
checkout=$(cd "$1" && pwd)
shift
here=$(cd "$(dirname "$0")" && pwd)
example="$checkout/apps/example"
applied=()
clean_up() {
  rm -f "$example/recorder-trim-probe.js" "$example/src/RecorderTrimProbe.tsx"
  local index
  for ((index = ${#applied[@]} - 1; index >= 0; index--)); do
    git -C "$checkout" apply -R "${applied[index]}"
  done
}
trap clean_up EXIT
for patch in "$@"; do
  patch=$(cd "$(dirname "$patch")" && pwd)/$(basename "$patch")
  git -C "$checkout" apply "$patch"
  applied+=("$patch")
done
cp "$here/recorder-trim-probe.js" "$example/recorder-trim-probe.js"
cp "$here/RecorderTrimProbe.tsx" "$example/src/RecorderTrimProbe.tsx"
(cd "$example" && mkdir -p dist/res &&
  npx react-native bundle --entry-file recorder-trim-probe.js --platform android --dev false --minify true \
    --bundle-output dist/main.android.jsbundle --assets-dest dist/res)
(cd "$example/android" && ./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a)
cp "$example/android/app/build/outputs/apk/release/app-release.apk" \
  "$here/recorder-trim-probe-$(git -C "$checkout" rev-parse --short HEAD).apk"
