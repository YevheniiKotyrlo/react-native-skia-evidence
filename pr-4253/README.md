# #4253: a canvas's replays paced by its presents, and a present held for the GPU

[wcandillon/react-native-skia#4253](https://github.com/wcandillon/react-native-skia/pull/4253)

## Builds

Release builds of the example app, arm64-v8a on Android, from a clone set up as [`packages/skia/CONTRIBUTING.md`](https://github.com/wcandillon/react-native-skia/blob/main/packages/skia/CONTRIBUTING.md) describes, with the census screen of this folder among the examples and opened at launch: [`FrameRateCensus.tsx`](FrameRateCensus.tsx) and [`index.ts`](index.ts) in `apps/example/src/Examples/FrameRateCensus/`, exported from `src/Examples/index.ts`, its route added to `src/types.ts` and `src/App.tsx`, and `rnskia://frame-rate-census` as the app's initial URL.

| Build | Source |
| --- | --- |
| `main` | `ec26f7d23` |
| this PR | `21d46fac2`, whose pacing and present hold the head keeps |

```sh
cd apps/example
npx react-native bundle --entry-file index.js --platform android --dev false --minify true \
  --bundle-output dist/main.android.jsbundle --assets-dest dist/res
cd android && ./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a
```

On iOS the same screen goes into a Release build of the example for iOS devices, with [`present-counter-main.patch`](present-counter-main.patch) applied to `main` or [`present-counter.patch`](present-counter.patch) to this PR: each window logs its presents a second. Apple views draw opacity the same either way, so the opaque rows there are the default canvases again.

## Steps

The census screen runs each configuration for 16 s and logs `CENSUS start <configuration>` as it begins: one, two, four and eight canvases drawing a circle, one canvas of 100 to 16000 circles, one, two and four opaque canvases drawing a circle, and one opaque canvas of 4000, 8000 and 12000 circles, every one moved by the canvas clock. Each launch of a build runs every configuration in turn; the builds alternate launch by launch.

- **Android:** from 4 s after each `CENSUS start`, a 10 s window of SurfaceFlinger's per-layer counts (`dumpsys SurfaceFlinger --timestats`): `totalFrames` of each opaque canvas's `SurfaceView` layer, and of the app window's layer for the default canvases, whose `TextureView`s it composites, beside `dumpsys gfxinfo`'s janky frames for that window. The phone's thermal state is read before every launch.
- **iOS:** the present counter's lines, a second each; a configuration reads the sum over its canvases of each canvas's median presents a second after its first 3 s.

## Readings

Galaxy S23 (Android 14, 120 Hz), Mi MIX 3 (Android 10, 60 Hz), RedMagic NX809J (Android 16, 144 Hz) and iPad Pro 12.9-inch (4th generation, iOS 27, 120 Hz). The tables are in the evidence comment on [#4253](https://github.com/wcandillon/react-native-skia/pull/4253); [`images/pr-4253-census.png`](../images/pr-4253-census.png) charts the Android rows.
