# React Native Skia benchmark: texture, android

Mi MIX 3 (Android SDK 29), react-native-skia react-native-skia 216d9c529, 2026-11-10T15:05:16.491Z. Plan: `scenes=shapes,shapeBlob,images,shader,pattern,paths,text&reps=2&gap=20&backing=texture&autostart=1`.
Present FPS is the median over reps of frames the compositor showed (8 s per scene).
Render and present ms/frame: CPU time of the `RNSkia Render` pool and the `RNSkia Present` thread over the same window, divided by the frames presented (median over reps). They keep measuring when present FPS sits at the panel rate.

| scene | Present FPS | per rep | render ms/frame | present ms/frame | UI FPS | JS FPS | busiest threads (% of a core) | thermal |
|---|---|---|---|---|---|---|---|---|
| shapes | 18.2 | 18.2 / 18.2 | 41.13 | 12.80 | 60 | 60 | RNSkia Render 76, RNSkia Present 25 |  |
| shapeBlob | 59.2 | 59.1 / 59.3 | 6.16 | 3.42 | 60 | 60 | RNSkia Render 34, RNSkia Present 20, RenderThread 14 |  |
| images | 57.4 | 57.0 / 57.7 | 13.65 | 7.55 | 60 | 60 | RNSkia Render 79, RNSkia Present 44, RenderThread 9 |  |
| shader | 59.4 | 59.3 / 59.4 | 1.06 | 3.47 | 60 | 60 | RNSkia Present 22, RenderThread 17, RNSkia Render 7 |  |
| pattern | 59.2 | 59.4 / 59.1 | 1.60 | 4.75 | 60 | 60 | RNSkia Present 29, RenderThread 20, RNSkia Render 9 |  |
| paths | 59.3 | 59.2 / 59.5 | 8.36 | 3.85 | 60 | 60 | RNSkia Render 49, RNSkia Present 23, RenderThread 15 |  |
| text | 22.9 | 21.7 / 24.0 | 43.49 | 7.54 | 60 | 60 | RNSkia Render 99, RNSkia Present 18 |  |
