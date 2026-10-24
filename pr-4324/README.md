# #4324: keep a view's native view, and what it shows, out of its superview

[wcandillon/react-native-skia#4324](https://github.com/wcandillon/react-native-skia/pull/4324)

## Builds

Release builds of the example app, arm64-v8a on Android, from a clone set up as [`packages/skia/CONTRIBUTING.md`](https://github.com/wcandillon/react-native-skia/blob/main/packages/skia/CONTRIBUTING.md) describes.

| Build | Source |
| --- | --- |
| `main` | `cce3cf0f2`, the PR's base; for the e2e cases, with the PR's `ClippedSubviews` screens and specs |
| this PR | `dd9545fd5` for the drives and the re-attach bench, its head for the trace of a view put back |

Each bench is a scene of its own, applied to either build for the bundle only:

```sh
git apply static-content-bench.patch    # or reattach-in-scroll-bench.patch
cd apps/example
BENCH_PRESENTERS="none canvas-texture" npx react-native bundle --entry-file static-content-bench.js \
  --platform android --dev false --minify true --bundle-output dist/main.android.jsbundle --assets-dest dist/res
cd android && ./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a
```

`BENCH_PRESENTERS` limits the static-content bench to plain views and canvases, which `main` has. The re-attach bench's entry file is `reattach-in-scroll-bench.js` and takes no variable. On iOS the same bundles go into a Release build of the example.

## Steps

Each bench starts on launch and logs its readings, one `BENCH` line per measured window (`adb logcat -s ReactNativeJS`, or the device console on iOS); a run is `main`'s build, then this PR's, under one hold of the device.

- [`static-content-bench.patch`](static-content-bench.patch): 120 views mounted and unmounted every 800 ms, each arm three passes of 9.6 s windows, every UI frame read inside the app (`BENCH probe … missedFrames=…`). Three rounds per build.
- [`reattach-in-scroll-bench.patch`](reattach-in-scroll-bench.patch): one or six canvases at the top of a scroll view that clips its subviews, scrolled away and back on every update, unchanged or changed while away, three passes of 100 trips each. Each window's CPU per thread is read from `/proc/<pid>/task/*/schedstat` at its `BENCH armed` and `BENCH ended` markers. Three pairs.

## A view put back in its superview

On the iPad Pro, a Release build of the example with [`reattach-frames/reattach-probe.patch`](reattach-frames/reattach-probe.patch) applied to this PR's head, and one with [`reattach-probe-at-layout.patch`](reattach-frames/reattach-probe-at-layout.patch) in its place: the same probe, with a view put back attached at layout, as before the fix. On `CACurrentMediaTime`'s clock, the probe logs each `CAMetalLayer` made for a view put back, the end of the run loop turn whose Core Animation commit carries it, every present onto it, every vsync, and what the attach's redraw decided. Its spec, `ReattachFrames.probe`, run as the e2e suite runs a spec, takes the clipped screen away and back five times and reorders three canvases six times, three times over. The log is `reattach-probe.log` in the app's `tmp` folder:

```sh
python analyze.py reattach-probe.log    # the vsyncs between each layer's commit and its first present
python sequence.py reattach-probe.log   # each layer's events in order
python classify.py reattach-probe.log   # what each attach's redraw decided, and whether it presented before the commit
```

51 views put back. Attached at layout, 47 first presented a vsync or more after the commit that carried their layer, empty until then. With this PR, the 45 that had a frame to show, 43 a queued recording and 2 their last frame, each presented it before that commit; the other 6 had presented nothing since they mounted and had nothing queued, and showed their first frame when it landed.

## Readings

iPad Pro 12.9-inch (4th generation), iOS 27, 120 Hz; Galaxy S23, Android 14, 120 Hz; Mi MIX 3, Android 10, 60 Hz.

The mount drives, missed frames per 9.6 s window: the median of three rounds, each round the median of three passes, with the range of the rounds.

| Drive | iPad Pro, `main` | iPad Pro, this PR | Galaxy S23, `main` | Galaxy S23, this PR |
| --- | --- | --- | --- | --- |
| mount 120 canvases, each its own drawing | 72 (70–73) | 72 (70–73) | 81 (74–82) | 71 (70–72) |
| mount 120 canvases of one drawing | 72 (72–73) | 72 (69–73) | 73 (71–83) | 72 (71–72) |
| 120 canvases mounted, their parent animating | 2 (2–2) | 2 (2–2) | 0 (0–0) | 0 (0–0) |
| a new drawing in 120 canvases every 800 ms | 4 (4–4) | 4 (4–4) | 0 (0–0) | 0 (0–0) |
| one canvas filling the screen | 0 (0–0) | 0 (0–0) | 0 (0–0) | 0 (0–0) |
| plain views | 0 (0–0) | 0 (0–0) | 1.5 (1.5–1.5) | 1 (0.5–2) |

The re-attach bench, CPU per trip in ms: the median of nine windows with their range.

| Thread, case | Mi MIX 3, `main` | Mi MIX 3, this PR | Galaxy S23, `main` | Galaxy S23, this PR |
| --- | --- | --- | --- | --- |
| present thread, unchanged, 6 canvases | 28.08 (21.97–28.44) | 31.47 (27.70–32.08) | 13.22 (12.89–13.54) | 14.79 (14.42–15.29) |
| present thread, unchanged, 1 canvas | 9.40 (4.24–9.77) | 10.83 (5.36–12.39) | 6.33 (5.29–6.53) | 6.23 (4.16–7.40) |
| recording threads, unchanged, 6 canvases | 8.99 (6.00–9.38) | 7.54 (6.60–7.73) | 2.20 (2.13–2.40) | 1.75 (1.64–1.81) |
| present thread, changed, 6 canvases | 37.71 (36.52–38.87) | 38.20 (31.12–38.95) | 17.35 (16.95–17.66) | 17.32 (17.03–17.80) |
| present thread, changed, 1 canvas | 12.45 (11.98–12.79) | 12.55 (11.66–12.70) | 6.67 (6.34–7.43) | 6.91 (6.63–7.36) |
| JS thread, unchanged, 6 canvases | 5.50 (4.38–5.79) | 5.77 (4.84–5.99) | 2.63 (2.54–2.66) | 2.59 (2.43–2.73) |
| main thread, unchanged, 6 canvases | 28.87 (22.52–29.39) | 28.36 (23.66–28.80) | 16.43 (15.63–17.41) | 16.42 (14.91–19.81) |

Every trip gives every canvas a new window on both builds: one `SkiaTextureView: onSurfaceTextureAvailable` per canvas per trip.
