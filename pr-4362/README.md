# What the threads outside the render pool keep once their surfaces go

Evidence only, not part of the PR.

- `RecorderTrimProbe.tsx` and `recorder-trim-probe.js`: the screen and its entry file. It makes and disposes 20 surfaces of 2048 × 2048 on the JS thread, then on the UI runtime and on a `createWorkletRuntime` runtime, then has the JS thread let go of 20 more in each of these ways: while it draws on every frame, disposed on the UI runtime, through `asImage()` images the UI runtime took, through snapshots taken into `MakeNull()` images, through snapshots shaders hold, as 20 snapshots of a canvas, and as `drawAsImage`'s surfaces left to the collector. It logs a `TRIM mark=<step>` line at each step, and a `TRIM memory` line with what the thread's recorders hold and Dawn's account of the device.
- `probe-memory.patch`: adds the readings the screen logs to `Skia.gpu`, for these builds only.
- `build-probe.sh <checkout> probe-memory.patch`: builds the example as an arm64 release APK whose bundle opens the screen.
- `run-probe.sh <serial> <apk> <folder>`: installs and starts it, dumps the app's memory (`dumpsys meminfo` of its pid, and `dumpsys gpu --gpumem` from Android 12) at each step, and 10 s after Home.
- `bun summarize-probe.ts <folder>`: each step's readings; `bun compare-runs.ts <base folder>... -- <head folder>...`: a phone's table in the PR's comment, each value the median of the runs a side; `bun submit-table.ts <phone>=<base folder>+...,<head folder>+...`: the submit-cost table.
- `request-cost.cpp`: what the request a GPU submit now makes costs, against the same loop without it (`g++ -std=c++20 -O2 -I <packages/skia>/cpp request-cost.cpp`).
- `runs/<phone>/`: the three runs of each build on each phone, made in turn: `main` with #4353 at `10a60ae74`, whose head now, `191e6db18`, differs from it only in what happens when a post to a thread's loop fails, which none of these steps meets, and this PR at `0a6a1dd1e`, whose head now, `4b5ca4745`, has the same native lines on a newer `main`. Each run keeps the phone's state before and after, the screen's log lines and its summary; `compared.md` and `runs/submit.md` are the comment's tables.
