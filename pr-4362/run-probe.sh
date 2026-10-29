#!/usr/bin/env bash
# Runs the recorder-trim probe on one Android phone: installs the APK, starts it, dumps the app's memory at every
# `TRIM mark=<step>` line the probe logs, and once it is done presses Home, sends the app the trim it gets when its UI
# is hidden and dumps once more, 10 s after. summarize-probe.ts reads the folder.
#   bash run-probe.sh <serial> <apk> <output folder>
set -euo pipefail
serial=$1
apk=$2
output=$3
aapt2=("${ANDROID_HOME:?ANDROID_HOME names the Android SDK}"/build-tools/*/aapt2*)
package=$("${aapt2[-1]}" dump packagename "$apk")
# The probe takes about four minutes; a run past this has stopped making progress.
run_limit_seconds=900
# Android sends the hidden trim once the app's UI goes away; the dump waits this long after Home.
after_home_seconds=10
mkdir -p "$output"

dump_memory() {
  local pid
  pid=$(adb -s "$serial" shell pidof "$package" | tr -d '\r')
  # By pid: MIUI's dumpsys can answer a package name with every process on the phone.
  adb -s "$serial" shell dumpsys meminfo "${pid:-$package}" > "$output/$1.meminfo.txt"
  # Android 12 and later count each process's GPU memory here, also where GL mtrack does not cover Vulkan's.
  {
    printf 'pid %s\n' "$pid"
    adb -s "$serial" shell dumpsys gpu --gpumem
  } > "$output/$1.gpumem.txt" 2>&1
}

adb -s "$serial" install -r "$apk" > "$output/install.log" 2>&1
adb -s "$serial" shell input keyevent KEYCODE_WAKEUP
adb -s "$serial" shell wm dismiss-keyguard
adb -s "$serial" shell am force-stop "$package"
adb -s "$serial" logcat -c
adb -s "$serial" logcat -v monotonic -s ReactNativeJS:V RNSkia:V AndroidRuntime:E libc:F DEBUG:F > "$output/logcat.txt" 2>&1 &
logcat_pid=$!
trap 'kill "$logcat_pid" 2>/dev/null || true; adb -s "$serial" shell am force-stop "$package" > /dev/null 2>&1 || true' EXIT
adb -s "$serial" shell monkey -p "$package" 1 > /dev/null 2>&1

started=$(date +%s)
outcome=running
while [ "$outcome" = running ]; do
  while IFS= read -r step; do
    grep -qxF "$step" "$output/steps.txt" 2>/dev/null && continue
    printf '%s\n' "$step" >> "$output/steps.txt"
    [ "$step" = done ] || dump_memory "$step"
  done < <(grep -oE 'TRIM mark=[a-z0-9-]+' "$output/logcat.txt" | sed 's/^TRIM mark=//' || true)
  if grep -qxF done "$output/steps.txt" 2>/dev/null; then
    outcome=done
  elif grep -qE "TRIM error|FATAL EXCEPTION|Fatal signal" "$output/logcat.txt"; then
    outcome=failed
  elif [ $(( $(date +%s) - started )) -gt "$run_limit_seconds" ]; then
    outcome=timed-out
  else
    sleep 1
  fi
done

if [ "$outcome" = done ]; then
  # Android refuses a background trim level for a process still in the foreground, so Home goes first.
  adb -s "$serial" shell input keyevent KEYCODE_HOME
  sleep 1
  adb -s "$serial" shell am send-trim-memory "$package" HIDDEN > /dev/null 2>&1 || true
  sleep "$after_home_seconds"
  dump_memory hidden-home-10s
fi
echo "outcome: $outcome after $(( $(date +%s) - started ))s"
[ "$outcome" = done ]
