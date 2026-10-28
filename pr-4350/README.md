# Display-link ticks after a recycle

Evidence only, not part of the PR.

- `add-tick-counter.py <worktree>`: adds a once-a-second tick counter to `SkiaView.mm`'s `onFrame`, as #4273 measured, which also logs the link's `preferredFrameRateRange.maximum` and writes its lines to the app's Documents.
- `probe-entry.js`: the bundle's entry. One canvas animates on every UI frame; it is mounted, taken out of its superview by a scroll view that clips its subviews and brought back, then unmounted and mounted again into the view Fabric recycled.
- `runs/main` and `runs/fix`: three rounds each on an iPad Pro 12.9" (4th generation, 120 Hz), Release builds, alternating.
- `bun summarize-ticks.ts runs/main runs/fix`: each phase's ticks per second and preferred maximum.
