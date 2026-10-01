# react-native-skia — before/after captures

Device captures backing my pull requests against
[Shopify/react-native-skia](https://github.com/Shopify/react-native-skia).

Each pair is shot on the **same device, in the same session**, from one JS bundle of the
example app assembled twice:

- **before** — with `main`'s native sources
- **after** — with the PR's native sources

`pr-4102-surfaceview-frame-rate-*.png` are a Galaxy S23 (Android 14, motion smoothness
Adaptive) on the Android Views screen with `SurfaceView` selected and the circle animating,
6 s after the last touch. The fps readout is drawn on the canvas from `useFrameCallback`.
They come from a handset because the emulator's only display mode is 60 Hz.
