# A canvas animating through GPU device losses

Evidence only, not part of the PR.

- `animated-canvas-device-losses.patch`: the example's `AnimatedCanvas` screen and `ProducerDeviceLoss.spec.tsx`, which loses the device ten times, 5.5 s apart, and snapshots the screen twice after each replacement, about 2 s apart.
- `screen-sequence.patch`: keeps every snapshot of a run in `E2E_SCREEN_DIR`.
- `runs/main` and `runs/this-pr`: three runs each on a Galaxy S23, release builds, alternating: each run's snapshots (`screens-N`), its jest log and the app's logcat (`run-N`).
- `bun classify-frames.ts runs/*/screens-*`: each loss's pair of snapshots, where the square is in each and whether they are the same frame.
- `bun loss-timeline.ts runs/*/run-*`: each loss's time to its replacement, and whether a buffer map was aborted before it.

To rerun, apply both patches, start the example on an Android device, and in `packages/skia` run `E2E=true CI=true E2E_SCREEN_DIR=<folder> yarn test -i ProducerDeviceLoss`.
