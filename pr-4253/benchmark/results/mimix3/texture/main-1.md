# React Native Skia benchmark: texture, android

Mi MIX 3 (Android SDK 29), react-native-skia react-native-skia 875211ceb, 2026-11-10T14:42:28.123Z. Plan: `scenes=shapes,shapeBlob,images,shader,pattern,paths,text&reps=2&gap=20&backing=texture&autostart=1`.
Present FPS is the median over reps of frames the compositor showed (8 s per scene).
Render and present ms/frame: CPU time of the `RNSkia Render` pool and the `RNSkia Present` thread over the same window, divided by the frames presented (median over reps). They keep measuring when present FPS sits at the panel rate.

| scene | Present FPS | per rep | render ms/frame | present ms/frame | UI FPS | JS FPS | busiest threads (% of a core) | thermal |
|---|---|---|---|---|---|---|---|---|
| shapes | 18.3 | 18.2 / 18.4 | 42.05 | 12.54 | 51 | 50 | RNSkia Render 81, RNSkia Present 26 |  |
| shapeBlob | 59.4 | 59.3 / 59.4 | 6.41 | 3.14 | 60 | 60 | RNSkia Render 39, RNSkia Present 18, RenderThread 16 |  |
| images | 57.4 | 56.9 / 57.9 | 12.58 | 6.49 | 60 | 60 | RNSkia Render 71, RNSkia Present 37, RenderThread 8 |  |
| shader | 59.1 | 59.4 / 58.8 | 1.15 | 3.25 | 60 | 60 | RNSkia Present 20, RenderThread 18, RNSkia Render 7 |  |
| pattern | 59.0 | 59.1 / 58.9 | 1.61 | 4.34 | 60 | 60 | RNSkia Present 27, RenderThread 20, RNSkia Render 10 |  |
| paths | 59.4 | 59.5 / 59.3 | 8.03 | 3.07 | 60 | 60 | RNSkia Render 51, RNSkia Present 19, RenderThread 16 |  |
| text | 22.2 | 21.3 / 23.0 | 44.52 | 7.95 | 60 | 60 | RNSkia Render 99, RNSkia Present 18 |  |
