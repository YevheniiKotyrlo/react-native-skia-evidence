# #4253 against `main` with the benchmark

- `run-mjs-android10.patch`: Android 10's perfetto has no SurfaceFlinger frame events, so on the Mi MIX 3 `apps/example/benchmarks/run.mjs` counts each layer's presented frames from SurfaceFlinger's timestats instead, over the window SurfaceFlinger times itself. It also drops the `\r` that adb's output carries on Windows. Apply it from the repository's root, `git apply <this folder>/run-mjs-android10.patch`, before running there.
- `trace-present-wait.sh`, `present-wait.pbtxt` and `present-wait.py`: what the `RNSkia Present` thread waits for in a scene. The script records an 8 s perfetto trace 9 s into each scene named, and `present-wait.py` prints, for each trace, the count, median and total of the present thread's slices, among them its fence waits (`Fence::waitForever`) inside `vkQueuePresentKHR`.
- `results/`: each run's result, by phone, canvas and run, as `run.mjs` wrote them, and what `present-wait.py` printed for the S23's traces. The Mi MIX 3's PR files name `216d9c529`, the commit their app was built at, where `run.mjs` named the checkout it ran in, `8d2c2b5ee`.

From `apps/example`, with the phone attached, four runs: `main`, this PR, this PR, `main`. `run.mjs` builds and installs the release app of the checkout it runs in.

```sh
# on main
node benchmarks/run.mjs --platform android --backing surface --reps 2 --gap 20 --label main
# on the PR's branch
node benchmarks/run.mjs --platform android --backing surface --reps 2 --gap 20 --label pr \
  --compare benchmarks/results/<main's result>.json
```

Then the same four runs with `--backing texture`. The evidence comment's values are the median of the four reps of each build, with their range.

The traces follow a `SurfaceView` run of each build, whose app stays installed:

```sh
# after main's run
bash <this folder>/trace-present-wait.sh traces-main shapes shader pattern
# after the PR's run
bash <this folder>/trace-present-wait.sh traces-pr shapes shader pattern
```
