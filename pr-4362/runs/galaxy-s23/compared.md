| Step: the thread's recorders · Dawn's allocation | `main` with #4353 | this PR |
| --- | --- | --- |
| the JS thread's 20 surfaces, 5 s after their dispose | 320.0 MB · Dawn 333.9 MB | 0.0 MB · Dawn 333.9 MB |
| … and Dawn asked to give back what it caches | 320.0 MB · Dawn 333.9 MB | 0.0 MB · Dawn 12.6 MB |
| the UI runtime's 20, 5 s after | 320.0 MB · Dawn 655.1 MB | 0.0 MB · Dawn 333.9 MB |
| a worker runtime's 20, 5 s after | 320.0 MB · Dawn 976.4 MB | 320.0 MB · Dawn 333.9 MB |
| … 5 s after its next surface | 256.0 MB · Dawn 976.4 MB | 0.0 MB · Dawn 333.9 MB |
| the JS thread's 20 while it draws on every frame, 5 s after | 320.0 MB · Dawn 912.1 MB | 0.0 MB · Dawn 12.6 MB |
| the JS thread's 20 disposed on the UI runtime, 5 s after | 320.0 MB · Dawn 912.1 MB | 0.0 MB · Dawn 333.9 MB |
| `asImage()` images the UI runtime took of the JS thread's 20, 5 s after their dispose | 320.0 MB · Dawn 912.1 MB | 0.0 MB · Dawn 333.9 MB |
| snapshots taken into `MakeNull()` images, 5 s after those are disposed | 640.0 MB · Dawn 1233.4 MB | 0.0 MB · Dawn 655.1 MB |
| snapshots shaders hold, 15 s after the shaders are disposed | 640.0 MB · Dawn 1233.4 MB | 0.0 MB · Dawn 333.9 MB |
| 20 snapshots of a canvas, 5 s after their dispose | 258.0 MB · Dawn 1251.5 MB | 0.0 MB · Dawn 30.7 MB |
| `drawAsImage`'s surfaces left to the collector, 5 s after | 626.0 MB · Dawn 1267.5 MB | 0.0 MB · Dawn 671.1 MB |
| 10 s after Home | GPU memory +1205.0 (+1204.8 to +1205.4) MB | GPU memory -4.2 (-4.2 to -4.1) MB |
