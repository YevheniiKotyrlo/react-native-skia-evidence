#!/usr/bin/env bash
# runs outside Git Bash: on the machine the phone is attached to
# Records what the present thread waits for in scenes of the benchmark (apps/example/benchmarks/run.mjs). Run run.mjs
# once on the phone first: the app it installs runs its plan at every launch. This launches it and, for each scene
# named, records a perfetto trace of the gfx atrace sections and the scheduler over the window run.mjs measures (9 s
# into the scene, 8 s long), then reads every trace with present-wait.py (pip install perfetto).
#   bash trace-present-wait.sh <output folder> <scene>...
set -euo pipefail
output=$1
shift
here=$(cd "$(dirname "$0")" && pwd)
package=com.reactnativeskia.example
trace_at_seconds=9
trace_seconds=8
mkdir -p "$output"
sed -e "s/@DURATION_MS@/$((trace_seconds * 1000))/" -e "s/@PACKAGE@/$package/" "$here/present-wait.pbtxt" > "$output/trace.pbtxt"
adb shell am force-stop "$package"
adb logcat -c
adb logcat -v monotonic -s ReactNativeJS:V > "$output/logcat.txt" 2>&1 &
logcat_pid=$!
trap 'kill "$logcat_pid" 2> /dev/null || true' EXIT
adb shell monkey -p "$package" 1 > /dev/null 2>&1
for scene in "$@"; do
  until grep -q "\[bench\] start scene=$scene rep=1" "$output/logcat.txt"; do
    sleep 0.5
  done
  sleep "$trace_at_seconds"
  on_device=/data/misc/perfetto-traces/present-wait-$scene.pftrace
  adb shell perfetto --txt -c - -o "$on_device" < "$output/trace.pbtxt" > /dev/null 2>&1
  adb pull "$on_device" "$output/$scene.pftrace" > /dev/null
  adb shell rm -f "$on_device"
done
python3 "$here/present-wait.py" "$output"/*.pftrace
