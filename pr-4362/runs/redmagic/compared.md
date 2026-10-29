| Step: the thread's recorders · Dawn's allocation | `main` with #4353 | this PR |
| --- | --- | --- |
| the JS thread's 20 surfaces, 5 s after their dispose | 320.0 MB · Dawn 334.7 MB | 0.0 MB · Dawn 334.7 MB |
| … and Dawn asked to give back what it caches | 320.0 MB · Dawn 334.7 MB | 0.0 MB · Dawn 13.5 MB |
| the UI runtime's 20, 5 s after | 320.0 MB · Dawn 656.0 MB | 0.0 MB · Dawn 334.7 MB |
| a worker runtime's 20, 5 s after | 320.0 MB · Dawn 977.2 MB | 320.0 MB · Dawn 334.7 MB |
| … 5 s after its next surface | 256.0 MB · Dawn 977.2 MB | 0.0 MB · Dawn 334.7 MB |
| the JS thread's 20 while it draws on every frame, 5 s after | 320.0 MB · Dawn 913.0 MB | 0.0 MB · Dawn 13.5 MB |
| the JS thread's 20 disposed on the UI runtime, 5 s after | 320.0 MB · Dawn 977.2 (913.0 to 977.2) MB | 0.0 MB · Dawn 334.7 MB |
| `asImage()` images the UI runtime took of the JS thread's 20, 5 s after their dispose | 320.0 MB · Dawn 961.2 (913.0 to 961.2) MB | 0.0 MB · Dawn 334.7 MB |
| snapshots taken into `MakeNull()` images, 5 s after those are disposed | 640.0 MB · Dawn 1234.2 MB | 0.0 MB · Dawn 656.0 MB |
| snapshots shaders hold, 15 s after the shaders are disposed | 640.0 MB · Dawn 1234.2 MB | 0.0 MB · Dawn 334.7 MB |
| 20 snapshots of a canvas, 5 s after their dispose | 261.1 MB · Dawn 1255.4 MB | 0.0 MB · Dawn 34.7 MB |
| `drawAsImage`'s surfaces left to the collector, 5 s after | 597.1 (208.0 to 661.1) MB · Dawn 1271.4 (945.0 to 1271.4) MB | 0.0 MB · Dawn 639.8 (639.8 to 672.0) MB |
| 10 s after Home | GPU memory +1238.8 (+912.4 to +1239.3) MB | GPU memory +93.3 (-3.3 to +93.5) MB |
