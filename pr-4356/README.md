# A canvas disposed or finished on one runtime under a draw on another

Evidence only, not part of the PR.

- `crashes/surface-disposed.txt` and `crashes/recording-finished.txt`: the PR's two cases on `main` `8e30d2eed`, run with the cases and their helpers on a Mi MIX 3 (Android 10), release build; the backtrace of each crash, `librnskia.so`'s frames symbolized with the build's unstripped library.
- `CrossRuntimeTimings.spec.tsx`: the PR's two cases, five rounds each, printing when the worklet's call started and returned against the JS thread's draw; it asserts nothing. `timings.txt` is its output on this PR's head `60170c857`, on the same phone, in ms from the start of the draw. To rerun, copy it into `packages/skia/src/renderer/__tests__/e2e/`, start the example on an Android device, and in `packages/skia` run `E2E=true CI=true yarn test -i CrossRuntimeTimings`.
- `CanvasDrawBench.tsx` and `canvas-draw-bench.js`: the bench screen, and the entry file that mounts it as the example's root component. Copy the screen into `apps/example/src/Examples/API/` and the entry file into `apps/example/`, bundle with `--entry-file canvas-draw-bench.js`, and build a release APK. Each launch logs one `CANVAS_BENCH` line per round (`adb logcat -s ReactNativeJS`), then `CANVAS_BENCH done`.
- `runs/`: the `CANVAS_BENCH` lines of each launch on the Mi MIX 3, `pairN-base` for `main` `8e30d2eed` and `pairN-head` for this PR's head `60170c857`, launched alternately, six times each, the app force-stopped between launches.
- `bun summarize-canvas-bench.ts runs`: each launch's median ns a call for each of the three calls, each side's median of its launches with their range, and each pair's head minus its base.
