# #4253: a canvas's replays paced by its presents, and a present held for the GPU

[wcandillon/react-native-skia#4253](https://github.com/wcandillon/react-native-skia/pull/4253)

## Builds

Release builds of the example app, arm64-v8a on Android, from a clone set up as [`packages/skia/CONTRIBUTING.md`](https://github.com/wcandillon/react-native-skia/blob/main/packages/skia/CONTRIBUTING.md) describes, with the frame-rate screen of this folder among the examples and opened at launch: [`FrameRateCensus.tsx`](FrameRateCensus.tsx) and [`index.ts`](index.ts) in `apps/example/src/Examples/FrameRateCensus/`, exported from `src/Examples/index.ts`, its route added to `src/types.ts` and `src/App.tsx`, and `rnskia://frame-rate-census` as the app's initial URL.

| Build | Source |
| --- | --- |
| `main` | `875211ceb` |
| this PR | `216d9c529` |

```sh
cd apps/example
npx react-native bundle --entry-file index.js --platform android --dev false --minify true \
  --bundle-output dist/main.android.jsbundle --assets-dest dist/res
cd android && ./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a
```

## Steps

The frame-rate screen runs each configuration for 16 s and logs `CENSUS start <configuration>` as it begins: one, two, four and eight canvases drawing a circle, one canvas of 100 to 16000 circles, one, two and four opaque canvases drawing a circle, and one opaque canvas of 4000, 8000 and 12000 circles, every one moved by the canvas clock. Each launch of a build runs every configuration in turn; the builds alternate launch by launch.

- **Android:** from 4 s after each `CENSUS start`, a 10 s window of SurfaceFlinger's per-layer counts (`dumpsys SurfaceFlinger --timestats -enable`, then `-disable` and `-dump`), counted per 10 s of the window's `displayOnTime`, the milliseconds SurfaceFlinger counted with the display on: `totalFrames` of each opaque canvas's `SurfaceView` layer, and of the app window's layer for the default canvases, whose `TextureView`s it composites, beside `dumpsys gfxinfo`'s janky frames for that window. The phone's thermal state is read before every launch.

## Readings

Galaxy S23 (Android 14, 120 Hz) and Mi MIX 3 (Android 10, 60 Hz). The rows are in the evidence comment on [#4253](https://github.com/wcandillon/react-native-skia/pull/4253).
