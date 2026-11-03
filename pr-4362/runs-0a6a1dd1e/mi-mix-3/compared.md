| Step: the thread's recorders · Dawn's allocation | `main` with #4353 | this PR |
| --- | --- | --- |
| the JS thread's 20 surfaces, 5 s after their dispose | 320.0 MB · Dawn 329.4 MB | 0.0 MB · Dawn 329.4 MB |
| … and Dawn asked to give back what it caches | 320.0 MB · Dawn 329.4 MB | 0.0 MB · Dawn 8.1 MB |
| the UI runtime's 20, 5 s after | 320.0 MB · Dawn 650.6 MB | 0.0 MB · Dawn 329.4 MB |
| a worker runtime's 20, 5 s after | 320.0 MB · Dawn 971.9 MB | 320.0 MB · Dawn 329.4 MB |
| … 5 s after its next surface | 256.0 MB · Dawn 971.9 MB | 0.0 MB · Dawn 329.4 (8.1 to 329.4) MB |
| the JS thread's 20 while it draws on every frame, 5 s after | 320.0 MB · Dawn 907.6 MB | 0.0 MB · Dawn 8.1 MB |
| the JS thread's 20 disposed on the UI runtime, 5 s after | 320.0 MB · Dawn 907.6 MB | 0.0 MB · Dawn 329.4 MB |
| `asImage()` images the UI runtime took of the JS thread's 20, 5 s after their dispose | 320.0 MB · Dawn 907.6 MB | 0.0 MB · Dawn 329.4 MB |
| snapshots taken into `MakeNull()` images, 5 s after those are disposed | 640.0 MB · Dawn 1228.9 MB | 0.0 MB · Dawn 650.6 MB |
| snapshots shaders hold, 15 s after the shaders are disposed | 640.0 MB · Dawn 1228.9 MB | 0.0 MB · Dawn 329.4 MB |
| 20 snapshots of a canvas, 5 s after their dispose | 255.1 MB · Dawn 842.5 MB | 0.0 MB · Dawn 23.3 MB |
| `drawAsImage`'s surfaces left to the collector, 5 s after | 623.1 (192.0 to 623.1) MB · Dawn 1260.1 (955.8 to 1260.1) MB | 0.0 MB · Dawn 618.4 (602.4 to 666.6) MB |
| 10 s after Home | GPU memory +1252.0 (+947.6 to +1252.0) MB | GPU memory +176.4 (+47.8 to +176.4) MB |
