# #4317: a canvas's failure to begin a frame, logged

[wcandillon/react-native-skia#4317](https://github.com/wcandillon/react-native-skia/pull/4317)

## Builds

Release builds of the example app, arm64-v8a, from a clone set up as [`packages/skia/CONTRIBUTING.md`](https://github.com/wcandillon/react-native-skia/blob/main/packages/skia/CONTRIBUTING.md) describes, on a Galaxy S23 (Android 14).

| Build | Source |
| --- | --- |
| `main` | `39d14f726` |
| this PR | `ab736d68a`; the head since, `7e2847d61`, renames the producer's begin to `tryBeginRecording()` and edits comments |

## A canvas whose frame cannot begin

[`BeginFailure.probe.spec.tsx`](BeginFailure.probe.spec.tsx) goes into `packages/skia/src/renderer/__tests__/e2e/` and runs against the e2e build of the example like the other specs (`E2E=true yarn jest -i src/renderer/__tests__/e2e/BeginFailure.probe.spec.tsx`), with `adb logcat` recording. It mounts the `OnLayout` screen once, then has JS contexts (`SkiaViewApi.makeGraphiteContext`) open recordings on the targets of the next eight view ids, mounts the screen again, so that the new canvas's frames cannot begin, and then finishes the recordings and asks those ids to redraw.

| | `main` | this PR |
| --- | --- | --- |
| first mount, red pixels | 129600 | 129600 |
| the canvas whose target's recording is open, red pixels | 0 | 0 |
| once the recordings finish and the canvas redraws, red pixels | 129600 | 129600 |
| `Canvas: beginning the frame failed` lines in logcat | 0 | 3, each `SkiaGraphiteView: a recording is already open, call finishRecording() first.` |

Over the same mounts a canvas's first job runs before the view has a size. This PR logs nothing for it; with `openRecordingLocked` throwing for a view without a size, as on `main`, the same run logs `Canvas: beginning the frame failed: SkiaGraphiteView: the view has no size yet.` twice.

## Cost

[`rerender-in-canvas-bench.patch`](rerender-in-canvas-bench.patch) adds a scene that mounts one canvas, then four, each a group of 100 circles under a component that re-renders back to back, in two arms: `unchanged`, every prop equal to the last render's, and `changed`, every circle's radius alternating, three passes each. At each window's two markers the scene waits for Back while every app thread's `/proc/<pid>/task/<tid>/schedstat` is read over adb; a thread's CPU per update is its run time between the two reads over the window's updates. The two builds ran in turn, three times each. CPU per update in ms, the median of nine windows with their range:

| Thread, case | `main` | this PR |
| --- | --- | --- |
| Skia render threads, unchanged, 1 canvas | 0.067 (0.053–0.071) | 0.068 (0.063–0.073) |
| Skia render threads, unchanged, 4 canvases | 0.798 (0.762–0.826) | 0.795 (0.784–0.821) |
| Skia render threads, changed, 1 canvas | 0.068 (0.053–0.090) | 0.066 (0.056–0.084) |
| Skia render threads, changed, 4 canvases | 0.795 (0.778–0.807) | 0.792 (0.785–0.826) |
| present thread, changed, 4 canvases | 0.967 (0.920–0.993) | 0.979 (0.954–0.998) |
| update of every canvas, changed, 4 canvases | 8.789 (8.750–8.875) | 8.758 (8.717–8.827) |

The JS thread, the main thread and the RenderThread overlap as well.
