# React Native Skia benchmark: texture, android

Mi MIX 3 (Android SDK 29), react-native-skia react-native-skia 875211ceb, 2026-11-10T15:16:44.990Z. Plan: `scenes=shapes,shapeBlob,images,shader,pattern,paths,text&reps=2&gap=20&backing=texture&autostart=1`.
Present FPS is the median over reps of frames the compositor showed (8 s per scene).
Render and present ms/frame: CPU time of the `RNSkia Render` pool and the `RNSkia Present` thread over the same window, divided by the frames presented (median over reps). They keep measuring when present FPS sits at the panel rate.

| scene | Present FPS | per rep | render ms/frame | present ms/frame | UI FPS | JS FPS | busiest threads (% of a core) | thermal |
|---|---|---|---|---|---|---|---|---|
| shapes | 18.2 | 18.1 / 18.3 | 43.48 | 13.20 | 50 | 50 | RNSkia Render 81, RNSkia Present 26 |  |
| shapeBlob | 58.9 | 58.5 / 59.3 | 6.79 | 3.22 | 60 | 60 | RNSkia Render 41, RNSkia Present 19, RenderThread 17 |  |
| images | 58.4 | 57.8 / 59.1 | 12.64 | 6.35 | 60 | 60 | RNSkia Render 73, RNSkia Present 36, RenderThread 7 |  |
| shader | 59.1 | 59.1 / 59.1 | 1.13 | 3.29 | 60 | 60 | RNSkia Present 19, RenderThread 18, RNSkia Render 7 |  |
| pattern | 59.3 | 59.4 / 59.2 | 1.61 | 4.42 | 60 | 60 | RNSkia Present 27, RenderThread 20, RNSkia Render 10 |  |
| paths | 59.3 | 59.2 / 59.5 | 7.79 | 3.01 | 60 | 60 | RNSkia Render 49, RNSkia Present 19, RenderThread 15 |  |
| text | 22.2 | 21.9 / 22.5 | 44.72 | 7.20 | 60 | 60 | RNSkia Render 100, RNSkia Present 16 |  |
