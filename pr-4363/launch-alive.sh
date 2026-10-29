#!/usr/bin/env bash
# Launches each APK on a device already claimed, <runs> times, and reports whether the app is alive 15 s after each
# launch, the threads of its process whose names hold "skia", and every native crash the device logged meanwhile: the
# crashing process and thread from the tombstone's header, with its top frames. The package is read from each APK, and
# each run's screen at 15 s, its whole crash buffer and its logcat are kept in <output>; with LAUNCH_RECORD=1 the first
# launch of each APK is also recorded, from just before it starts until 12 s after.
#   [LAUNCH_RECORD=1] bash launch-alive.sh <serial> <runs> <output> <apk>...
set -u
serial=$1
runs=$2
output=$3
shift 3
build_tools=("$(cygpath -u "${ANDROID_HOME:?ANDROID_HOME names the Android SDK}")"/build-tools/*/aapt2.exe)
aapt2=${build_tools[-1]}
mkdir -p "$output"
echo "device $serial: Android $(adb -s "$serial" shell getprop ro.build.version.release | tr -d '\r'), API $(adb -s "$serial" shell getprop ro.build.version.sdk | tr -d '\r'), $(adb -s "$serial" shell getprop ro.product.model | tr -d '\r'), $(adb -s "$serial" shell getprop ro.build.type | tr -d '\r')"
for apk in "$@"; do
  name=$(basename "$apk" .apk)
  package=$("$aapt2" dump packagename "$(cygpath -m "$apk")" | tr -d '\r')
  timeout 300 adb -s "$serial" install -r -g "$(cygpath -m "$apk")" > /dev/null 2>&1 || echo "$name: install failed"
  for run in $(seq 1 "$runs"); do
    adb -s "$serial" shell am force-stop "$package"
    adb -s "$serial" logcat -b all -c
    recording=
    if [ "${LAUNCH_RECORD:-}" = 1 ] && [ "$run" = 1 ]; then
      adb -s "$serial" shell screenrecord --time-limit 13 "/sdcard/$name-run$run.mp4" &
      recording=$!
      sleep 1
    fi
    adb -s "$serial" shell am start -W -n "$package/com.microsoft.reacttestapp.MainActivity" > /dev/null 2>&1
    sleep 15
    if [ -n "$recording" ]; then
      wait "$recording"
      adb -s "$serial" pull "/sdcard/$name-run$run.mp4" "$(cygpath -m "$output")/$name-run$run.mp4" > /dev/null 2>&1
      adb -s "$serial" shell rm -f "/sdcard/$name-run$run.mp4"
    fi
    pid=$(adb -s "$serial" shell pidof "$package" | tr -d '\r')
    threads=""
    if [ -n "$pid" ]; then
      threads=$(adb -s "$serial" shell "ps -T -p $pid -o CMD" | tr -d '\r' | grep -i "skia" | sort | uniq -c | awk '{count=$1; $1=""; printf "%s x%s,", substr($0,2), count}')
    fi
    adb -s "$serial" exec-out screencap -p > "$output/$name-run$run.png" 2> /dev/null
    adb -s "$serial" logcat -b all -d > "$output/$name-run$run.logcat.txt" 2>&1
    adb -s "$serial" logcat -b crash -d > "$output/$name-run$run.crash.txt" 2>&1
    crashes=$(grep -E "F DEBUG +: +pid: [0-9]+, tid: [0-9]+, name: .* >>> .* <<<" "$output/$name-run$run.logcat.txt" | sed -E 's/.*pid: ([0-9]+), tid: [0-9]+, name: (.*) +>>> (.*) <<<.*/\3 (pid \1, thread \2)/' | tr '\n' ';')
    frames=$(grep -E "F DEBUG +: +#0[0-3] pc" "$output/$name-run$run.logcat.txt" | sed -E 's/.*\(([^()]+)\(.*/\1/' | head -4 | tr '\n' '<')
    echo "$name run $run: $([ -n "$pid" ] && echo "alive (pid $pid) threads: ${threads}" || echo "DEAD") crashes: ${crashes:-none} ${frames:0:300}"
  done
done
