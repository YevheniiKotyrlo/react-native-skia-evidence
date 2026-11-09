# #4352: give back the GPU memory Dawn keeps once Skia is idle

[wcandillon/react-native-skia#4352](https://github.com/wcandillon/react-native-skia/pull/4352)

Release builds of the example app, arm64-v8a, from a clone set up as [`packages/skia/CONTRIBUTING.md`](https://github.com/wcandillon/react-native-skia/blob/main/packages/skia/CONTRIBUTING.md): `main` at `875211ceb` and this PR at `60b82458f`, each with `dawn-memory.patch`; this PR's builds also with `round-probe.patch`.

| File | What it is |
| --- | --- |
| `ReleaseBench.tsx` | the screen: per arm, 96 cycles of 120 `<Canvas>` of 40 pt mounted for 500 ms and unmounted for 100 ms, then idle. 8 s after the last unmount it logs `BENCH memory-unmounted arm=<arm>-after`, where EGL is read; 40 s later it logs Dawn's account as held, then asks Dawn and logs the account again. The arms are plain views, canvases, blurred canvases and plain views again, or with `BENCH_ARMS="none canvas-webgpu"` canvases beside a WebGPU triangle drawing on `Skia.getNativeDevice()` |
| `release-bench.js` | the entry file that registers the screen |
| `dawn-memory.patch` | `Skia.gpu.__memory(reduce)`: Dawn's allocated and used bytes and the Graphite context's cache; with `reduce` true, after calling `ReduceMemoryUsage` again while it returns true, 25 ms apart, ticking the device in between |
| `round-probe.patch` | a log line per release round on this PR's release thread: what it found (0 Dawn gave back all it could, 1 more remains, 2 the device had work in flight, `busy` the context lock was taken), its time under the context lock, and the requests it served |

`../captures/pr-4352-release-bench-*-60b82458f-*.txt` hold each run's readings: `dumpsys meminfo`'s EGL mtrack at every marker with the time the reading began, and the bench's and the probe's log lines, on the logcat clock.
