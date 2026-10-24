# #4328: SkiaImageView and `<Canvas static>`, presented from one bitmap per image

[wcandillon/react-native-skia#4328](https://github.com/wcandillon/react-native-skia/pull/4328)

## Builds

Release builds of the example app, arm64-v8a on Android, from a clone set up as [`packages/skia/CONTRIBUTING.md`](https://github.com/wcandillon/react-native-skia/blob/main/packages/skia/CONTRIBUTING.md) describes.

| Build | Source |
| --- | --- |
| `main` | `cce3cf0f2`, for the canvases' comparison: `BENCH_PRESENTERS="none canvas-texture"` |
| this PR | its head, `c729429dd` |

Each scene is applied to a build for its bundle only:

```sh
git apply static-content-bench.patch    # or w1/cycle-check.patch
cd apps/example
npx react-native bundle --entry-file static-content-bench.js --platform android --dev false --minify true \
  --bundle-output dist/main.android.jsbundle --assets-dest dist/res
cd android && ./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a
```

`BENCH_PRESENTERS` (`none`, `canvas-texture`, `canvas-static`, `image-view`) limits the presenters the bench mounts; `BENCH_CYCLES` sets the cycle check's mounts per arm. On iOS the same bundles go into a Release build of the example.

## Steps

Each bench starts on launch and logs its readings, one `BENCH` line per measured window (`adb logcat -s ReactNativeJS`, or the device console on iOS).

- [`static-content-bench.patch`](static-content-bench.patch): 120 views of 40 points mounted and unmounted every 800 ms, each showing one image or one of 120 through a plain `View`, a `<Canvas>`, a `<Canvas static>` or a `SkiaImageView`; then mounted under a parent whose opacity and scale animate; then given a new image every 800 ms. Each arm runs three passes of 9.6 s windows, every UI-thread frame read by a Reanimated frame callback (`BENCH probe … missedFrames=…`): a missed frame is a frame period of the window no callback ran in. The memory phase logs `BENCH memory-mounted` and `BENCH memory-unmounted` markers, at each of which I read `adb shell dumpsys meminfo <package>`. [`spread.py`](spread.py) turns the logs into the tables: `python spread.py S23=s23.log RedMagic=redmagic.log`.
- [`w1/cycle-check.patch`](w1/cycle-check.patch): the bench with 1,000 mount cycles per arm and Dawn's account of its allocator after each arm, as held and once asked to reduce, through [`w1/dawn-memory.patch`](w1/dawn-memory.patch), which adds that account to the native build. [`w1/idle-trace-before.patch`](w1/idle-trace-before.patch) and [`w1/release-trace.patch`](w1/release-trace.patch) log the render threads' idle runs and the poller's release rounds; [`w1/busy-after-request.patch`](w1/busy-after-request.patch) gives every render thread a 5 ms job 100 ms after the latest idle request, the race `RNSkIdleTaskSchedule` closes.
- [`probes.patch`](probes.patch): e2e probes of their own. `FirstPixel.probe` mounts one view at a time and captures every frame from the commit that mounts it until its pixels show, twelve times per presenter and size (`FIRST_PIXEL`, summed up by [`first-pixel.py`](first-pixel.py)); `Background.probe` sends the app to the background and back and compares a static canvas's frame and an image view's bitmap before and after; `ImageViews.probe` drives the example's image views page in Chromium (`IMAGE_VIEWS_WEB_PASSES`, summed up by [`summarize.py`](summarize.py)). The device probes run as the e2e specs do, from `packages/skia` with the example open on its tests screen (`E2E=true yarn test -i FirstPixel.probe`); the web one from the root, on a production bundle (`npx playwright test --config apps/example/playwright.config.ts ImageViews.probe`).
- [`MinifiedCapture.probe.spec.tsx`](MinifiedCapture.probe.spec.tsx), copied into `packages/skia/src/renderer/__tests__/e2e/`, writes the minified screens to `CAPTURE_DIRECTORY` as captured; [`crop-capture.ts`](crop-capture.ts) crops their middles, at their own pixels.
- [`ZonePlate.tsx`](ZonePlate.tsx), registered in `apps/example/src/Tests/Screens/index.ts` as `ZonePlate`, draws a 4096 × 4096 zone plate into an image view filling the screen; [`ZonePlateCapture.probe.spec.tsx`](ZonePlateCapture.probe.spec.tsx) writes it to `CAPTURE_DIRECTORY`. Its "before" ran with `PresentedImage.levelFor` returning 0, so that the view draws the bitmap itself.

## Readings

Galaxy S23, Android 14, 120 Hz; Mi MIX 3, Android 10, 60 Hz; RedMagic NX809J, Android 16, 144 Hz; iPad Pro 12.9-inch (4th generation), iOS 27, 120 Hz. The tables are in the evidence comment on [#4328](https://github.com/wcandillon/react-native-skia/pull/4328); [`images/`](../images) holds the zone plate and the minified stripes before and after, as the S23's screen was captured.
