# react-native-skia — before/after captures

Device captures backing my pull requests against
[Shopify/react-native-skia](https://github.com/Shopify/react-native-skia).

Each pair is shot on the **same device, in the same session**, from the example app, and differs
only in the PR's change: **before** is `main`, **after** is the PR.

- `pr-4102-surfaceview-frame-rate-*.png` — Galaxy S23 (Android 14, motion smoothness Adaptive),
  release build, Android Views screen with `SurfaceView` selected and the circle animating, 6 s
  after the last touch. One JS bundle assembled with `main`'s native sources and with the PR's.
- `pr-4102-opaque-canvas-frame-rate-*.png` — the same device and screen on the PR merged with
  `main`'s Graphite canvas, with `opaque` on, which backs the canvas with a `SurfaceView`. One JS
  bundle assembled with `main`'s native sources and with the PR's.
- `pr-4086-onsize-scaled-parent-ipad-*.png` — iPad Pro 12.9-inch (4th generation, iPadOS 27.0.1),
  release build, `OnSize` screen. One native build with two embedded bundles: `main`'s
  `Canvas.tsx` and `GraphiteCanvas.tsx`, and the PR's.

The fps readouts are drawn on the canvas from `useFrameCallback`. The Android pairs come from a
handset because the emulator's only display mode is 60 Hz.
