# react-native-skia evidence

Builds, steps and device readings behind my pull requests to [wcandillon/react-native-skia](https://github.com/wcandillon/react-native-skia).

| PR | Page |
| --- | --- |
| [#4086](https://github.com/wcandillon/react-native-skia/pull/4086): `onSize` from the canvas's layout event | [pr-4086](pr-4086/README.md) |
| [#4102](https://github.com/wcandillon/react-native-skia/pull/4102): the `SurfaceView` frame-rate vote | [pr-4102](pr-4102/README.md) |
| [#4253](https://github.com/wcandillon/react-native-skia/pull/4253): a canvas's replays paced by its presents, and a present held for the GPU | [pr-4253](pr-4253/README.md) |
| [#4308](https://github.com/wcandillon/react-native-skia/pull/4308): the scene nodes a re-render leaves unchanged, kept | [pr-4308](pr-4308/README.md) |
| [#4324](https://github.com/wcandillon/react-native-skia/pull/4324): a view's native view kept out of its superview | [pr-4324](pr-4324/README.md) |
| [#4328](https://github.com/wcandillon/react-native-skia/pull/4328): `SkiaImageView` and `<Canvas static>`, presented from one bitmap per image | [pr-4328](pr-4328/README.md) |
| [#4348](https://github.com/wcandillon/react-native-skia/pull/4348): a recording's queue slot given back once the view is done with it, through GPU device losses | [pr-4348](pr-4348/README.md) |
| [#4350](https://github.com/wcandillon/react-native-skia/pull/4350): a display link made after a recycle or a trip asking for the full rate | [pr-4350](pr-4350/README.md) |
| [#4356](https://github.com/wcandillon/react-native-skia/pull/4356): a draw in flight kept until it returns when another runtime disposes or finishes its canvas | [pr-4356](pr-4356/README.md) |
| [#4362](https://github.com/wcandillon/react-native-skia/pull/4362): the recorders of the threads outside the render pool, trimmed | [pr-4362](pr-4362/README.md) |
| [#4363](https://github.com/wcandillon/react-native-skia/pull/4363): the GPU device made on a thread that never exits | [pr-4363](pr-4363/README.md) |

[`tools/measure-surfaceflinger.sh`](tools/measure-surfaceflinger.sh) records 10 s of SurfaceFlinger's per-layer stats for an app's `SurfaceView` and reads its frame-rate vote. [`images/`](images) holds the screenshots the PR comments show, named after the pull request, or after the branch of a change I have not opened yet.
