# React Native Skia benchmark: surface, android

Mi MIX 3 (Android SDK 29), react-native-skia react-native-skia 216d9c529, 2026-11-10T14:19:10.574Z. Plan: `scenes=shapes,shapeBlob,images,shader,pattern,paths,text&reps=2&gap=20&backing=surface&autostart=1`.
Present FPS is the median over reps of frames the compositor showed (8 s per scene).
Render and present ms/frame: CPU time of the `RNSkia Render` pool and the `RNSkia Present` thread over the same window, divided by the frames presented (median over reps). They keep measuring when present FPS sits at the panel rate.

| scene | Present FPS | per rep | render ms/frame | present ms/frame | UI FPS | JS FPS | busiest threads (% of a core) | thermal |
|---|---|---|---|---|---|---|---|---|
| shapes | 18.2 | 18.2 / 18.3 | 40.40 | 18.01 | 60 | 60 | RNSkia Render 74, RNSkia Present 40 |  |
| shapeBlob | 58.9 | 58.8 / 58.9 | 7.35 | 4.05 | 60 | 60 | RNSkia Render 44, RNSkia Present 24 |  |
| images | 56.9 | 56.1 / 57.6 | 13.82 | 8.73 | 60 | 60 | RNSkia Render 78, RNSkia Present 50 |  |
| shader | 58.8 | 58.5 / 59.1 | 1.17 | 3.87 | 60 | 60 | RNSkia Present 23, RNSkia Render 7 |  |
| pattern | 59.3 | 59.3 / 59.2 | 1.43 | 4.15 | 60 | 60 | RNSkia Present 24, RNSkia Render 8 |  |
| paths | 58.1 | 58.0 / 58.3 | 9.26 | 3.70 | 60 | 60 | RNSkia Render 50, RNSkia Present 22 |  |
| text | 24.0 | 23.5 / 24.6 | 40.82 | 11.13 | 60 | 60 | RNSkia Render 99, RNSkia Present 26 |  |
