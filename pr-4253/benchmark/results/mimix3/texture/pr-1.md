# React Native Skia benchmark: texture, android

Mi MIX 3 (Android SDK 29), react-native-skia react-native-skia 216d9c529, 2026-11-10T14:53:57.295Z. Plan: `scenes=shapes,shapeBlob,images,shader,pattern,paths,text&reps=2&gap=20&backing=texture&autostart=1`.
Present FPS is the median over reps of frames the compositor showed (8 s per scene).
Render and present ms/frame: CPU time of the `RNSkia Render` pool and the `RNSkia Present` thread over the same window, divided by the frames presented (median over reps). They keep measuring when present FPS sits at the panel rate.

| scene | Present FPS | per rep | render ms/frame | present ms/frame | UI FPS | JS FPS | busiest threads (% of a core) | thermal |
|---|---|---|---|---|---|---|---|---|
| shapes | 18.3 | 18.2 / 18.3 | 41.69 | 12.50 | 60 | 60 | RNSkia Render 78, RNSkia Present 24 |  |
| shapeBlob | 59.4 | 59.4 / 59.3 | 6.64 | 3.52 | 60 | 60 | RNSkia Render 40, RNSkia Present 21, RenderThread 17 |  |
| images | 57.8 | 57.5 / 58.1 | 13.24 | 7.43 | 60 | 60 | RNSkia Render 75, RNSkia Present 43, RenderThread 9 |  |
| shader | 59.3 | 59.4 / 59.2 | 1.13 | 3.54 | 60 | 60 | RNSkia Present 20, RenderThread 18, RNSkia Render 7 |  |
| pattern | 59.1 | 59.3 / 59.0 | 1.63 | 4.78 | 60 | 60 | RNSkia Present 28, RenderThread 20, RNSkia Render 10 |  |
| paths | 59.3 | 59.5 / 59.2 | 8.34 | 3.81 | 60 | 60 | RNSkia Render 50, RNSkia Present 23, RenderThread 15 |  |
| text | 23.1 | 24.2 / 22.0 | 42.95 | 7.60 | 60 | 60 | RNSkia Render 99, RNSkia Present 17 |  |
