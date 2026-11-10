# React Native Skia benchmark: surface, android

SM-S911B (Android SDK 34), react-native-skia react-native-skia 875211ceb, 2026-11-09T22:30:48.632Z. Plan: `scenes=shapes,shapeBlob,images,shader,pattern,paths,text&reps=2&gap=20&backing=surface&autostart=1`.
Present FPS is the median over reps of frames the compositor showed (8 s per scene).
Render and present ms/frame: CPU time of the `RNSkia Render` pool and the `RNSkia Present` thread over the same window, divided by the frames presented (median over reps). They keep measuring when present FPS sits at the panel rate.

| scene | Present FPS | per rep | render ms/frame | present ms/frame | UI FPS | JS FPS | busiest threads (% of a core) | thermal |
|---|---|---|---|---|---|---|---|---|
| shapes | 56.1 | 56.0 / 56.3 | 15.38 | 4.65 | 120 | 120 | RNSkia Render 87, RNSkia Present 28 | 1 |
| shapeBlob | 119.4 | 119.4 / 119.4 | 2.18 | 2.05 | 120 | 120 | RNSkia Render 26, RNSkia Present 25 | 1 |
| images | 119.3 | 119.4 / 119.3 | 6.19 | 2.82 | 120 | 120 | RNSkia Render 74, RNSkia Present 34 | 1 |
| shader | 119.4 | 119.4 / 119.4 | 0.47 | 1.88 | 120 | 120 | RNSkia Present 22, RNSkia Render 6 | 1 |
| pattern | 119.3 | 119.4 / 119.3 | 0.52 | 1.99 | 120 | 120 | RNSkia Present 24, RNSkia Render 6 | 1 |
| paths | 119.1 | 119.4 / 118.8 | 4.05 | 2.07 | 120 | 120 | RNSkia Render 49, RNSkia Present 25 | 1 |
| text | 64.6 | 63.3 / 65.9 | 14.43 | 3.09 | 120 | 120 | RNSkia Render 95, RNSkia Present 20 | 1 |
