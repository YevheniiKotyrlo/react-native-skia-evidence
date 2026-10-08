# react-native-skia evidence

Builds, steps and device readings behind my pull requests to [wcandillon/react-native-skia](https://github.com/wcandillon/react-native-skia).

| PR | Page |
| --- | --- |
| [#4086](https://github.com/wcandillon/react-native-skia/pull/4086): `onSize` from the canvas's layout event | [pr-4086](pr-4086/README.md) |
| [#4102](https://github.com/wcandillon/react-native-skia/pull/4102): the `SurfaceView` frame-rate vote | [pr-4102](pr-4102/README.md) |

[`tools/measure-surfaceflinger.sh`](tools/measure-surfaceflinger.sh) records 10 s of SurfaceFlinger's per-layer stats for an app's `SurfaceView` and reads its frame-rate vote. [`images/`](images) holds the screenshots the PR comments show.
