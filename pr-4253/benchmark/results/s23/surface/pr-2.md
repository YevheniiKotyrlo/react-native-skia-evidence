# React Native Skia benchmark: surface, android

SM-S911B (Android SDK 34), react-native-skia react-native-skia 216d9c529, 2026-11-09T22:19:39.374Z. Plan: `scenes=shapes,shapeBlob,images,shader,pattern,paths,text&reps=2&gap=20&backing=surface&autostart=1`.
Present FPS is the median over reps of frames the compositor showed (8 s per scene).
Render and present ms/frame: CPU time of the `RNSkia Render` pool and the `RNSkia Present` thread over the same window, divided by the frames presented (median over reps). They keep measuring when present FPS sits at the panel rate.

| scene | Present FPS | per rep | render ms/frame | present ms/frame | UI FPS | JS FPS | busiest threads (% of a core) | thermal |
|---|---|---|---|---|---|---|---|---|
| shapes | 57.9 | 58.1 / 57.6 | 13.64 | 5.23 | 120 | 120 | RNSkia Render 79, RNSkia Present 30 | 0 |
| shapeBlob | 119.5 | 119.5 / 119.5 | 2.13 | 2.08 | 120 | 120 | RNSkia Render 25, RNSkia Present 24 | 0, 1 |
| images | 116.1 | 116.0 / 116.3 | 6.14 | 2.85 | 120 | 120 | RNSkia Render 71, RNSkia Present 33 | 0, 1 |
| shader | 119.4 | 119.4 / 119.4 | 0.47 | 1.98 | 120 | 120 | RNSkia Present 24, RNSkia Render 6 | 0, 1 |
| pattern | 119.4 | 119.4 / 119.5 | 0.50 | 2.01 | 120 | 120 | RNSkia Present 24, RNSkia Render 6 | 0, 1 |
| paths | 119.2 | 119.1 / 119.3 | 4.03 | 2.13 | 120 | 120 | RNSkia Render 50, RNSkia Present 26 | 0, 1 |
| text | 70.4 | 69.3 / 71.6 | 13.58 | 2.97 | 120 | 120 | RNSkia Render 97, RNSkia Present 21 | 0, 1 |
