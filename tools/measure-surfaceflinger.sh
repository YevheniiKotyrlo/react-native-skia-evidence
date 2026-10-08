#!/usr/bin/env bash
# Usage: measure-surfaceflinger.sh <adb-serial> [package]
# After a 4 s settle, records 10 s of SurfaceFlinger's per-layer stats for the app and reads the
# frame-rate vote on its SurfaceView. Touching the screen during the window changes the display's rate.
set -uo pipefail
SERIAL=$1
APP=${2:-com.microsoft.reacttestapp}
OUT=$(mktemp -d)

shell() { adb -s "$SERIAL" shell "$@"; }

top_activity() {
  shell dumpsys activity activities | grep -m1 -E "topResumedActivity|mResumedActivity" | sed -E 's/.* u0 ([^ ]+) .*/\1/'
}

layer_frames() {
  awk -v pattern="$1" '
    /^displayRefreshRate = / { rate = $3 }
    /^layerName = / { current = ($0 ~ pattern); next }
    current && /^totalFrames = / { frames[rate] += $3; total += $3 }
    current && /present2present histogram is as below:/ {
      getline histogram
      count = split(histogram, buckets, " ")
      for (i = 1; i <= count; i++) {
        split(buckets[i], pair, "=")
        presents[pair[1]] += pair[2]
      }
    }
    END {
      if (total == 0) { print "no frames"; exit }
      for (interval in presents) {
        if (presents[interval] > most) { most = presents[interval]; dominant = interval }
      }
      rates = ""
      for (rate in frames) {
        if (rate != "") rates = rates (rates == "" ? "" : ", ") frames[rate] " at " rate " Hz"
      }
      print total " frames" (rates == "" ? "" : " (" rates ")") ", most presents " dominant " apart"
    }
  ' "$OUT/timestats.txt"
}

surface_view_vote() {
  local vote
  vote=$(awk -v app="$APP" '
    /HWC layers:/ { inTable = 1; next }
    inTable && /^$/ { exit }
    inTable && index($0, "SurfaceView[" substr(app, 1, 16)) && /\(BLAST\)/ { getline row; print row; exit }
  ' "$OUT/surfaceflinger.txt" | awk -F'|' '{ print $NF }' | sed -E 's/\[[^]]*\]//g; s/ +/ /g; s/^ //; s/ $//')
  echo "${vote:-none}"
}

shell sleep 4
before=$(top_activity)
shell dumpsys SurfaceFlinger --timestats -disable > /dev/null
shell dumpsys SurfaceFlinger --timestats -clear -enable > /dev/null
shell sleep 10
shell dumpsys SurfaceFlinger > "$OUT/surfaceflinger.txt"
shell dumpsys SurfaceFlinger --timestats -dump > "$OUT/timestats.txt"
shell dumpsys SurfaceFlinger --timestats -disable > /dev/null
after=$(top_activity)

case "$before $after" in
  "$APP/"*" $APP/"*) echo "foreground: $APP throughout" ;;
  *) echo "foreground: INVALID, '$before' then '$after'" ;;
esac
echo "window: $(grep -a -m1 'displayOnTime' "$OUT/timestats.txt" | sed -E 's/^displayOnTime = //')"
echo "SurfaceView layer: $(layer_frames "^layerName = .*SurfaceView(\\\\[| - )${APP}/")"
echo "SurfaceView vote: $(surface_view_vote)"
echo "dumps: $OUT" >&2
