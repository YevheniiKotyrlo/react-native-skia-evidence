# React Native Skia benchmark: surface, android

SM-S911B (Android SDK 34), react-native-skia react-native-skia 216d9c529, 2026-11-09T22:08:30.216Z. Plan: `scenes=shapes,shapeBlob,images,shader,pattern,paths,text&reps=2&gap=20&backing=surface&autostart=1`.
Present FPS is the median over reps of frames the compositor showed (8 s per scene).
Render and present ms/frame: CPU time of the `RNSkia Render` pool and the `RNSkia Present` thread over the same window, divided by the frames presented (median over reps). They keep measuring when present FPS sits at the panel rate.

| scene | Present FPS | per rep | render ms/frame | present ms/frame | UI FPS | JS FPS | busiest threads (% of a core) | thermal |
|---|---|---|---|---|---|---|---|---|
| shapes | 58.0 | 57.9 / 58.1 | 13.69 | 5.14 | 120 | 120 | RNSkia Render 80, RNSkia Present 30 | 0 |
| shapeBlob | 119.4 | 119.5 / 119.4 | 2.19 | 2.13 | 120 | 120 | RNSkia Render 26, RNSkia Present 26 | 0 |
| images | 115.9 | 115.9 / 115.9 | 6.19 | 2.83 | 120 | 120 | RNSkia Render 71, RNSkia Present 32 | 0 |
| shader | 119.4 | 119.4 / 119.4 | 0.46 | 1.92 | 120 | 120 | RNSkia Present 23, RNSkia Render 6 | 0 |
| pattern | 119.1 | 119.4 / 118.8 | 0.51 | 1.98 | 120 | 120 | RNSkia Present 25, RNSkia Render 6 | 0 |
| paths | 119.1 | 119.1 / 119.0 | 4.04 | 2.10 | 120 | 120 | RNSkia Render 49, RNSkia Present 26 | 0 |
| text | 71.9 | 70.5 / 73.4 | 13.70 | 2.94 | 120 | 120 | RNSkia Render 99, RNSkia Present 21 | 0 |
