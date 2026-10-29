#!/usr/bin/env bash
# Runs a debug APK of the example on a device already claimed: the home screen, which draws no canvas, until the JS
# thread has made the GPU device on its idle read of Skia.gpu, then <route>, <runs> times in each of two orders —
# `control` opens <route> straight away, `reload` first reloads the JS (React Native's RELOAD_APP_ACTION broadcast,
# which ends the JS thread for a new one). Each run reports the thread that logged "Selected Dawn adapter", the device's
# creation, whether it outlived the reload, whether the app is alive 15 s after <route> opens, and every native crash the
# device logged meanwhile: the crashing process and thread from the tombstone's header, with its top frames. The dev
# server is pointed at a closed port, so the APK's own bundle runs and no bundler on the host serves another. <route> is
# opened as the example's agent workflow opens one (.github/scripts/agent-screen.sh), by an explicit intent to the test
# app's activity, which is not exported. Each run's screen at 15 s, its logcat and its crash buffer are kept in <output>.
#   bash reload-alive.sh <serial> <runs> <output> <apk> <route>
set -u
serial=$1
runs=$2
output=$3
apk=$4
route=$5
build_tools=("$(cygpath -u "${ANDROID_HOME:?ANDROID_HOME names the Android SDK}")"/build-tools/*/aapt2.exe)
aapt2=${build_tools[-1]}
mkdir -p "$output"
on_device() { adb -s "$serial" shell "$@" | tr -d '\r'; }
echo "device $serial: Android $(on_device getprop ro.build.version.release), API $(on_device getprop ro.build.version.sdk), $(on_device getprop ro.product.model), $(on_device getprop ro.build.type)"
name=$(basename "$apk" .apk)
package=$("$aapt2" dump packagename "$(cygpath -m "$apk")" | tr -d '\r')
timeout 300 adb -s "$serial" install -r -g "$(cygpath -m "$apk")" > /dev/null 2>&1 || { echo "$name: install failed"; exit 1; }
preferences="<?xml version='1.0' encoding='utf-8' standalone='yes' ?><map><string name=\"debug_http_host\">localhost:9</string></map>"
on_device "echo $(printf '%s' "$preferences" | base64 -w0) | base64 -d | run-as $package sh -c 'mkdir -p shared_prefs && cat > shared_prefs/${package}_preferences.xml'"
echo "dev server: $(on_device "run-as $package cat shared_prefs/${package}_preferences.xml" | grep -o 'localhost:[0-9]*')"
thread_of() { on_device "ps -T -p $1 -o TID,CMD" | awk -v tid="$2" '$1 == tid { print $2 }'; }
for order in control reload; do
  for run in $(seq 1 "$runs"); do
    tag="$name-$order-run$run"
    on_device am force-stop "$package"
    adb -s "$serial" logcat -b all -c
    on_device am start -W -n "$package/com.microsoft.reacttestapp.MainActivity" > /dev/null
    sleep 12
    pid=$(on_device pidof "$package")
    maker=$(adb -s "$serial" logcat -d -v threadtime | grep -m 1 'Selected Dawn adapter' | awk '{ print $4 }')
    maker_name=$([ -n "$pid" ] && [ -n "$maker" ] && thread_of "$pid" "$maker")
    made="device made on tid ${maker:-none} (${maker_name:-gone})"
    if [ "$order" = reload ]; then
      on_device am broadcast -a "$package.RELOAD_APP_ACTION" > /dev/null
      sleep 10
      made="$made, $([ -n "$(thread_of "$pid" "$maker")" ] && echo "alive" || echo "gone") after the reload"
    fi
    on_device su 0 am start -a android.intent.action.VIEW -d "rnskia://$route" --activity-single-top \
      -n "$package/com.microsoft.reacttestapp.component.ComponentActivity" > /dev/null
    sleep 15
    alive=$(on_device pidof "$package")
    adb -s "$serial" exec-out screencap -p > "$output/$tag.png" 2> /dev/null
    adb -s "$serial" logcat -b all -d -v threadtime > "$output/$tag.logcat.txt" 2>&1
    adb -s "$serial" logcat -b crash -d > "$output/$tag.crash.txt" 2>&1
    crashes=$(grep -E "F DEBUG +: +pid: [0-9]+, tid: [0-9]+, name: .* >>> .* <<<" "$output/$tag.logcat.txt" | sed -E 's/.*pid: ([0-9]+), tid: [0-9]+, name: (.*) +>>> (.*) <<<.*/\3 (pid \1, thread \2)/' | tr '\n' ';')
    frames=$(grep -E "F DEBUG +: +#0[0-3] pc" "$output/$tag.logcat.txt" | sed -E 's/.*\(([^()]+)\(.*/\1/' | head -4 | tr '\n' '<')
    if [ -n "$pid" ] && [ "$alive" = "$pid" ]; then
      process="alive (pid $pid)"
    elif [ -n "$alive" ]; then
      process="DEAD (pid ${pid:-none}; pid $alive is a new process the route's intent started)"
    else
      process="DEAD"
    fi
    echo "$tag: $made; $route opened: $process crashes: ${crashes:-none} ${frames:0:300}"
  done
done
