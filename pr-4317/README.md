# #4317: a canvas's failure to begin a frame, logged

[wcandillon/react-native-skia#4317](https://github.com/wcandillon/react-native-skia/pull/4317)

## Builds

Release builds of the example app, arm64-v8a, from a clone set up as [`packages/skia/CONTRIBUTING.md`](https://github.com/wcandillon/react-native-skia/blob/main/packages/skia/CONTRIBUTING.md) describes, on a Galaxy S23 (Android 14).

| Build | Source |
| --- | --- |
| `main` | `39d14f726` for the probe, `feee40afc` for the cost; the producer and the target are the same in both |
| this PR | `b08116fb4` |

## A canvas whose frame cannot begin

[`BeginFailure.probe.spec.tsx`](BeginFailure.probe.spec.tsx) goes into `packages/skia/src/renderer/__tests__/e2e/` and runs against the e2e build of the example like the other specs (`E2E=true yarn jest -i src/renderer/__tests__/e2e/BeginFailure.probe.spec.tsx`), with `adb logcat` recording. It mounts the `OnLayout` screen once, then has JS contexts (`SkiaViewApi.makeGraphiteContext`) open recordings on the targets of the next eight view ids, mounts the screen again, so that the new canvas's frames cannot begin, and then finishes the recordings and asks those ids to redraw.

| | `main` | this PR |
| --- | --- | --- |
| first mount, red pixels | 129600 | 129600 |
| the canvas whose target's recording is open, red pixels | 0 | 0 |
| once the recordings finish and the canvas redraws, red pixels | 129600 | 129600 |
| `Canvas: beginning the frame failed` lines in logcat | 0 | 3, each `SkiaGraphiteView: a recording is already open, call finishRecording() first.` |

Over the same mounts a canvas's first job runs before the view has a size. This PR logs nothing for it; with `openRecordingLocked` throwing for a view without a size, as on `main`, the same run logs `Canvas: beginning the frame failed: SkiaGraphiteView: the view has no size yet.` twice.

## The log buffer

[`log-race.cpp`](log-race.cpp) logs a thousand messages from each of two threads at once through `RNSkLogger::logToConsole`. From the repository's root, with the dependencies installed:

```sh
g++ -std=c++20 -g -fsanitize=thread -I packages/skia/cpp -I node_modules/react-native/ReactCommon/jsi \
  log-race.cpp -o log-race -pthread && ./log-race
```

On `main`:

```
WARNING: ThreadSanitizer: data race
    #1 RNSkia::RNSkLogger::logToConsole(char const*, ...) packages/skia/cpp/utils/RNSkLog.h:48
  Location is global 'RNSkia::RNSkLogger::logToConsole(char const*, ...)::buffer' of size 512
SUMMARY: ThreadSanitizer: data race packages/skia/cpp/utils/RNSkLog.h:48 in RNSkia::RNSkLogger::logToConsole(char const*, ...)
```

On this PR it reports nothing and exits 0.

## Cost

[`rerender-in-canvas-bench.patch`](rerender-in-canvas-bench.patch) adds a scene that mounts one canvas, then four, each a group of 100 circles under a component that re-renders back to back, in two arms: `unchanged`, every prop equal to the last render's, and `changed`, every circle's radius alternating, three passes each. At each window's two markers the scene waits for Back while every app thread's `/proc/<pid>/task/<tid>/schedstat` is read over adb; a thread's CPU per update is its run time between the two reads over the window's updates. The two builds ran in turn, three times each. CPU per update in ms, the median of nine windows with their range:

| Thread, case | `main` | this PR |
| --- | --- | --- |
| Skia render threads, unchanged, 1 canvas | 0.075 (0.062–0.084) | 0.075 (0.060–0.104) |
| Skia render threads, unchanged, 4 canvases | 0.805 (0.781–0.813) | 0.810 (0.796–0.817) |
| Skia render threads, changed, 1 canvas | 0.068 (0.060–0.101) | 0.073 (0.067–0.082) |
| Skia render threads, changed, 4 canvases | 0.801 (0.788–0.817) | 0.803 (0.789–0.846) |
| present thread, changed, 4 canvases | 0.982 (0.972–0.993) | 0.979 (0.939–0.991) |
| update of every canvas, changed, 4 canvases | 8.859 (8.795–8.949) | 8.890 (8.806–8.951) |

The JS thread, the main thread and the RenderThread overlap as well.
