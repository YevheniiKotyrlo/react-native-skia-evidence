# React Native Skia benchmark: texture, android

SM-S911B (Android SDK 34), react-native-skia react-native-skia 216d9c529, 2026-11-09T22:53:09.386Z. Plan: `scenes=shapes,shapeBlob,images,shader,pattern,paths,text&reps=2&gap=20&backing=texture&autostart=1`.
Present FPS is the median over reps of frames the compositor showed (8 s per scene).
Render and present ms/frame: CPU time of the `RNSkia Render` pool and the `RNSkia Present` thread over the same window, divided by the frames presented (median over reps). They keep measuring when present FPS sits at the panel rate.

| scene | Present FPS | per rep | render ms/frame | present ms/frame | UI FPS | JS FPS | busiest threads (% of a core) | thermal |
|---|---|---|---|---|---|---|---|---|
| shapes | 46.8 | 52.5 / 41.1 | 14.26 | 6.21 | 120 | 120 | RNSkia Render 59, RNSkia Present 28, RenderThread 5 | 1 |
| shapeBlob | 119.9 | 119.9 / 119.9 | 1.78 | 1.67 | 120 | 120 | RNSkia Render 21, RNSkia Present 20, RenderThread 20 | 1 |
| images | 115.2 | 116.5 / 113.9 | 5.77 | 2.71 | 120 | 120 | RNSkia Render 66, RNSkia Present 31, RenderThread 10 | 1 |
| shader | 119.8 | 119.9 / 119.8 | 0.51 | 1.97 | 120 | 120 | RNSkia Present 24, RenderThread 23, RNSkia Render 6 | 1 |
| pattern | 119.9 | 119.9 / 119.9 | 0.55 | 1.97 | 120 | 120 | RNSkia Present 24, RenderThread 24, RNSkia Render 7 | 1 |
| paths | 119.9 | 119.9 / 119.9 | 3.42 | 1.77 | 120 | 120 | RNSkia Render 41, RNSkia Present 22, RenderThread 19 | 1 |
| text | 65.1 | 65.1 / 65.0 | 14.29 | 3.07 | 120 | 120 | RNSkia Render 93, RNSkia Present 20, RenderThread 6 | 1 |
