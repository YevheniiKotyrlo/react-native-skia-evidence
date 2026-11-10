# React Native Skia benchmark: texture, android

SM-S911B (Android SDK 34), react-native-skia react-native-skia 875211ceb, 2026-11-09T22:42:00.478Z. Plan: `scenes=shapes,shapeBlob,images,shader,pattern,paths,text&reps=2&gap=20&backing=texture&autostart=1`.
Present FPS is the median over reps of frames the compositor showed (8 s per scene).
Render and present ms/frame: CPU time of the `RNSkia Render` pool and the `RNSkia Present` thread over the same window, divided by the frames presented (median over reps). They keep measuring when present FPS sits at the panel rate.

| scene | Present FPS | per rep | render ms/frame | present ms/frame | UI FPS | JS FPS | busiest threads (% of a core) | thermal |
|---|---|---|---|---|---|---|---|---|
| shapes | 56.4 | 58.0 / 54.9 | 15.32 | 4.48 | 119 | 119 | RNSkia Render 89, RNSkia Present 28, RenderThread 6 | 1 |
| shapeBlob | 119.9 | 119.9 / 119.9 | 1.88 | 1.42 | 120 | 120 | RenderThread 20, RNSkia Render 19, RNSkia Present 15 | 1 |
| images | 119.7 | 119.6 / 119.8 | 5.92 | 2.72 | 120 | 120 | RNSkia Render 75, RNSkia Present 35, RenderThread 11 | 1 |
| shader | 118.3 | 120.0 / 116.6 | 0.52 | 1.64 | 120 | 120 | RenderThread 23, RNSkia Present 19, RNSkia Render 6 | 1 |
| pattern | 119.9 | 119.9 / 119.9 | 0.53 | 1.55 | 120 | 120 | RenderThread 24, RNSkia Present 19, RNSkia Render 7 | 1 |
| paths | 119.9 | 119.8 / 120.0 | 3.45 | 1.51 | 120 | 120 | RNSkia Render 42, RenderThread 19, RNSkia Present 19 | 1 |
| text | 61.4 | 63.0 / 59.9 | 15.70 | 3.23 | 120 | 120 | RNSkia Render 100, RNSkia Present 21, RenderThread 6 | 1 |
