# #4308: the scene nodes a re-render leaves unchanged, kept

[wcandillon/react-native-skia#4308](https://github.com/wcandillon/react-native-skia/pull/4308)

## Builds

Release builds of the example app, arm64-v8a, from a clone set up as [`packages/skia/CONTRIBUTING.md`](https://github.com/wcandillon/react-native-skia/blob/main/packages/skia/CONTRIBUTING.md) describes, on a Mi MIX 3 (Android 10, MIUI 12.0.2). The two builds share one native build: each bundles its JavaScript and is packaged over it, and their native libraries are byte for byte the same.

| Build | Source |
| --- | --- |
| `main` | `feee40afc` |
| this PR | `d0d488d5f` |

## Re-renders inside a canvas

[`rerender-in-canvas-bench.patch`](rerender-in-canvas-bench.patch) adds a scene that mounts one canvas, then four, each a group of 100 circles under a component that re-renders back to back, in two arms: `unchanged`, every prop equal to the last render's, and `changed`, every circle's radius alternating; 20 warm-up and 200 measured updates per window, three passes each. Each update waits for every canvas's commit, which a passive effect reports, so nothing inside a canvas runs a layout effect, whose commit would record on both sides. At each window's two markers the scene waits for Back while `dumpsys gfxinfo` is reset and read and every app thread's `/proc/<pid>/task/<tid>/schedstat` is read over adb; a thread's CPU per update is its run time between the two reads over the window's updates. The two builds ran in turn, three times each. The median of nine windows per side, with their range:

| Measure, case | `main` | this PR |
| --- | --- | --- |
| update of every canvas, ms, unchanged, 1 canvas | 8.89 (7.68–8.99) | 4.13 (4.11–4.35) |
| update of every canvas, ms, unchanged, 4 canvases | 37.55 (33.86–37.89) | 17.20 (16.96–17.41) |
| update of every canvas, ms, changed, 1 canvas | 9.02 (8.00–9.07) | 9.31 (9.18–9.45) |
| update of every canvas, ms, changed, 4 canvases | 37.69 (34.02–38.23) | 39.54 (38.95–40.14) |
| frames rendered per window, unchanged, 1 canvas | 111 (97–112) | 0 (0–0) |
| frames rendered per window, unchanged, 4 canvases | 452 (402–457) | 0 (0–0) |
| frames rendered per window, changed, 1 canvas | 112 (100–113) | 115 (114–117) |
| frames rendered per window, changed, 4 canvases | 454 (409–458) | 473 (470–477) |
| JS thread, ms per update, unchanged, 4 canvases | 37.41 (33.54–37.66) | 17.76 (17.61–17.92) |
| main thread, ms per update, unchanged, 4 canvases | 4.30 (2.60–4.89) | 1.34 (0.82–1.59) |
| RenderThread, ms per update, unchanged, 4 canvases | 3.30 (2.44–3.54) | 0.004 (0.002–0.011) |
| Skia render threads, ms per update, unchanged, 4 canvases | 3.23 (2.61–3.39) | 0.012 (0.010–0.019) |
| Skia present thread, ms per update, unchanged, 4 canvases | 5.63 (5.22–5.87) | 0 (0–0) |
| JS thread, ms per update, changed, 4 canvases | 37.46 (33.76–37.91) | 39.14 (38.84–39.34) |

With no prop changes the view draws no frame on this PR, and the update takes 53.5 % and 54.2 % less. With every radius changing it takes 3.2 % and 4.9 % more, `shallowEq` comparing each node's props before it clones; there the main, render and present threads' ranges overlap `main`'s. A changed window renders a few more frames on this PR because its 200 updates take longer.

The noise floor: `main` against itself, two pairs more on the same device, moves no update, frame or JS-thread row by more than 1.3 %, every range overlapping.

To rerun it, apply the patch to `main` and to the PR's branch. In `apps/example` run `npx react-native bundle --entry-file rerender-in-canvas-bench.js --platform android --dev false --minify true --bundle-output dist/main.android.jsbundle --assets-dest dist/res`, which the release build packages as it stands, then `./gradlew assembleRelease` in its `android` folder, and install and open the app. The scene runs every case itself and waits at each `BENCH armed` and `BENCH ended` line in logcat until Back is pressed, twice a window, so the frame counter can be reset at the first (`adb shell dumpsys gfxinfo com.reactnativeskia.example reset`) and its `Total frames rendered` read at the second. Each `BENCH window` line carries its window's median as `updateMedianMs`; a cell is the median of its case's nine, over three launches.
