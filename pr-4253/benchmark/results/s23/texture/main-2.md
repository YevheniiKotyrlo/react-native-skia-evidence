# React Native Skia benchmark: texture, android

SM-S911B (Android SDK 34), react-native-skia react-native-skia 875211ceb, 2026-11-09T23:15:28.854Z. Plan: `scenes=shapes,shapeBlob,images,shader,pattern,paths,text&reps=2&gap=20&backing=texture&autostart=1`.
Present FPS is the median over reps of frames the compositor showed (8 s per scene).
Render and present ms/frame: CPU time of the `RNSkia Render` pool and the `RNSkia Present` thread over the same window, divided by the frames presented (median over reps). They keep measuring when present FPS sits at the panel rate.

| scene | Present FPS | per rep | render ms/frame | present ms/frame | UI FPS | JS FPS | busiest threads (% of a core) | thermal |
|---|---|---|---|---|---|---|---|---|
| shapes | 57.3 | 57.1 / 57.4 | 14.91 | 4.41 | 119 | 119 | RNSkia Render 83, RNSkia Present 25, RenderThread 6 | 2 |
| shapeBlob | 119.9 | 120.0 / 119.9 | 1.93 | 1.44 | 120 | 120 | RNSkia Render 24, RenderThread 23, RNSkia Present 18 | 2 |
| images | 119.7 | 119.6 / 119.8 | 5.74 | 2.54 | 120 | 120 | RNSkia Render 69, RNSkia Present 30, RenderThread 10 | 2 |
| shader | 119.9 | 119.9 / 119.9 | 0.52 | 1.66 | 120 | 120 | RenderThread 24, RNSkia Present 20, RNSkia Render 6 | 2 |
| pattern | 119.9 | 119.9 / 119.9 | 0.53 | 1.60 | 120 | 120 | RenderThread 24, RNSkia Present 20, RNSkia Render 6 | 2 |
| paths | 119.8 | 119.8 / 119.8 | 3.42 | 1.53 | 120 | 120 | RNSkia Render 41, RenderThread 19, RNSkia Present 18 | 2 |
| text | 62.4 | 62.4 / 62.5 | 14.54 | 3.04 | 120 | 120 | RNSkia Render 91, RNSkia Present 19, RenderThread 6 | 2 |
