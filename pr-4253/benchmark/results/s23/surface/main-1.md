# React Native Skia benchmark: surface, android

SM-S911B (Android SDK 34), react-native-skia react-native-skia 875211ceb, 2026-11-09T21:57:05.948Z. Plan: `scenes=shapes,shapeBlob,images,shader,pattern,paths,text&reps=2&gap=20&backing=surface&autostart=1`.
Present FPS is the median over reps of frames the compositor showed (8 s per scene).
Render and present ms/frame: CPU time of the `RNSkia Render` pool and the `RNSkia Present` thread over the same window, divided by the frames presented (median over reps). They keep measuring when present FPS sits at the panel rate.

| scene | Present FPS | per rep | render ms/frame | present ms/frame | UI FPS | JS FPS | busiest threads (% of a core) | thermal |
|---|---|---|---|---|---|---|---|---|
| shapes | 58.9 | 59.0 / 58.8 | 14.44 | 3.94 | 120 | 120 | RNSkia Render 85, RNSkia Present 24 | 0 |
| shapeBlob | 119.4 | 119.4 / 119.4 | 2.17 | 2.04 | 120 | 120 | RNSkia Render 26, RNSkia Present 24 | 0 |
| images | 119.1 | 119.4 / 118.8 | 6.21 | 2.82 | 120 | 120 | RNSkia Render 74, RNSkia Present 34 | 0 |
| shader | 119.1 | 119.4 / 118.8 | 0.48 | 1.98 | 120 | 120 | RNSkia Present 24, RNSkia Render 6 | 0 |
| pattern | 119.1 | 118.8 / 119.4 | 0.51 | 2.02 | 120 | 120 | RNSkia Present 25, RNSkia Render 6 | 0 |
| paths | 119.4 | 119.4 / 119.4 | 4.20 | 2.15 | 120 | 120 | RNSkia Render 49, RNSkia Present 25 | 0 |
| text | 68.6 | 67.1 / 70.0 | 14.05 | 2.97 | 120 | 120 | RNSkia Render 97, RNSkia Present 20 | 0 |
