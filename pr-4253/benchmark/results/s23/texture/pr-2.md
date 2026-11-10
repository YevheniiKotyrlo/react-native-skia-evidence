# React Native Skia benchmark: texture, android

SM-S911B (Android SDK 34), react-native-skia react-native-skia 216d9c529, 2026-11-09T23:04:19.236Z. Plan: `scenes=shapes,shapeBlob,images,shader,pattern,paths,text&reps=2&gap=20&backing=texture&autostart=1`.
Present FPS is the median over reps of frames the compositor showed (8 s per scene).
Render and present ms/frame: CPU time of the `RNSkia Render` pool and the `RNSkia Present` thread over the same window, divided by the frames presented (median over reps). They keep measuring when present FPS sits at the panel rate.

| scene | Present FPS | per rep | render ms/frame | present ms/frame | UI FPS | JS FPS | busiest threads (% of a core) | thermal |
|---|---|---|---|---|---|---|---|---|
| shapes | 44.3 | 31.1 / 57.5 | 15.36 | 6.42 | 120 | 120 | RNSkia Render 81, RNSkia Present 30, RenderThread 6 | 1, 2 |
| shapeBlob | 119.9 | 119.9 / 119.9 | 1.88 | 1.77 | 120 | 120 | RNSkia Render 23, RNSkia Present 22, RenderThread 22 | 2 |
| images | 119.3 | 119.6 / 118.9 | 5.78 | 2.63 | 120 | 120 | RNSkia Render 69, RNSkia Present 32, RenderThread 10 | 2 |
| shader | 119.9 | 119.9 / 119.9 | 0.50 | 1.99 | 120 | 120 | RNSkia Present 24, RenderThread 23, RNSkia Render 6 | 2 |
| pattern | 119.8 | 119.9 / 119.8 | 0.54 | 1.81 | 120 | 120 | RNSkia Present 24, RenderThread 24, RNSkia Render 7 | 2 |
| paths | 119.9 | 119.9 / 119.9 | 3.39 | 1.77 | 120 | 120 | RNSkia Render 40, RNSkia Present 21, RenderThread 19 | 2 |
| text | 61.6 | 62.9 / 60.3 | 14.91 | 3.22 | 120 | 120 | RNSkia Render 90, RNSkia Present 20, RenderThread 6 | 2 |
