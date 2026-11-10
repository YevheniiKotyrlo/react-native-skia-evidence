# React Native Skia benchmark: surface, android

Mi MIX 3 (Android SDK 29), react-native-skia react-native-skia 875211ceb, 2026-11-10T14:30:48.955Z. Plan: `scenes=shapes,shapeBlob,images,shader,pattern,paths,text&reps=2&gap=20&backing=surface&autostart=1`.
Present FPS is the median over reps of frames the compositor showed (8 s per scene).
Render and present ms/frame: CPU time of the `RNSkia Render` pool and the `RNSkia Present` thread over the same window, divided by the frames presented (median over reps). They keep measuring when present FPS sits at the panel rate.

| scene | Present FPS | per rep | render ms/frame | present ms/frame | UI FPS | JS FPS | busiest threads (% of a core) | thermal |
|---|---|---|---|---|---|---|---|---|
| shapes | 18.2 | 18.2 / 18.2 | 43.25 | 16.60 | 60 | 60 | RNSkia Render 78, RNSkia Present 31 |  |
| shapeBlob | 59.2 | 59.2 / 59.2 | 7.04 | 3.68 | 60 | 60 | RNSkia Render 45, RNSkia Present 23 |  |
| images | 55.2 | 54.9 / 55.6 | 14.16 | 9.19 | 60 | 60 | RNSkia Render 78, RNSkia Present 52 |  |
| shader | 59.1 | 59.0 / 59.3 | 1.17 | 3.87 | 60 | 60 | RNSkia Present 24, RNSkia Render 7 |  |
| pattern | 59.3 | 59.2 / 59.4 | 1.45 | 4.23 | 60 | 60 | RNSkia Present 26, RNSkia Render 9 |  |
| paths | 59.4 | 59.5 / 59.2 | 10.09 | 3.73 | 60 | 60 | RNSkia Render 59, RNSkia Present 22 |  |
| text | 23.5 | 24.5 / 22.5 | 41.75 | 11.66 | 60 | 60 | RNSkia Render 97, RNSkia Present 30 |  |
