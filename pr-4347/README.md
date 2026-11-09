# A render thread's idle task run again once the thread goes idle after a busy run

Evidence only, not part of the PR. `main` is `3c29267b5`, the PR `626e78f69`; every build is a release build of the example.

- `idle-run-probe.patch`: the scene the PR's evidence comment measures, as the example's entry (`apps/example/idle-run-probe.js`), with `__idleRunCensus` and `__memory` on `Skia.gpu` and a log line around each idle-task run. It applies to `main` and to the PR.
- `pool-bench.cpp`: the worker loop's cost per job, built once against each side's `RNSkThreadPool.h`, run from `adb shell`.

The steps to build and run each, and what each side reads, are in [the PR's evidence comment](https://github.com/wcandillon/react-native-skia/pull/4347#issuecomment-6472798560).
