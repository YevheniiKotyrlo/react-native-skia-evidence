# React Native Skia benchmark: surface, android

Mi MIX 3 (Android SDK 29), react-native-skia react-native-skia 875211ceb, 2026-11-10T13:56:26.726Z. Plan: `scenes=shapes,shapeBlob,images,shader,pattern,paths,text&reps=2&gap=20&backing=surface&autostart=1`.
Present FPS is the median over reps of frames the compositor showed (8 s per scene).
Render and present ms/frame: CPU time of the `RNSkia Render` pool and the `RNSkia Present` thread over the same window, divided by the frames presented (median over reps). They keep measuring when present FPS sits at the panel rate.

| scene | Present FPS | per rep | render ms/frame | present ms/frame | UI FPS | JS FPS | busiest threads (% of a core) | thermal |
|---|---|---|---|---|---|---|---|---|
| shapes | 18.3 | 18.1 / 18.4 | 41.92 | 16.13 | 60 | 60 | RNSkia Render 80, RNSkia Present 35 |  |
| shapeBlob | 59.4 | 59.3 / 59.5 | 7.36 | 3.94 | 60 | 60 | RNSkia Render 44, RNSkia Present 23 |  |
| images | 54.9 | 52.5 / 57.3 | 14.21 | 9.36 | 60 | 60 | RNSkia Render 79, RNSkia Present 51 |  |
| shader | 59.2 | 59.2 / 59.2 | 1.16 | 3.91 | 60 | 60 | RNSkia Present 23, RNSkia Render 7 |  |
| pattern | 59.2 | 59.2 / 59.3 | 1.50 | 4.39 | 60 | 60 | RNSkia Present 26, RNSkia Render 9 |  |
| paths | 59.3 | 59.4 / 59.3 | 9.83 | 3.92 | 60 | 60 | RNSkia Render 59, RNSkia Present 24 |  |
| text | 23.0 | 22.9 / 23.1 | 42.46 | 12.84 | 60 | 60 | RNSkia Render 98, RNSkia Present 30 |  |
