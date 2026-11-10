# React Native Skia benchmark: surface, android

Mi MIX 3 (Android SDK 29), react-native-skia react-native-skia 216d9c529, 2026-11-10T14:07:47.193Z. Plan: `scenes=shapes,shapeBlob,images,shader,pattern,paths,text&reps=2&gap=20&backing=surface&autostart=1`.
Present FPS is the median over reps of frames the compositor showed (8 s per scene).
Render and present ms/frame: CPU time of the `RNSkia Render` pool and the `RNSkia Present` thread over the same window, divided by the frames presented (median over reps). They keep measuring when present FPS sits at the panel rate.

| scene | Present FPS | per rep | render ms/frame | present ms/frame | UI FPS | JS FPS | busiest threads (% of a core) | thermal |
|---|---|---|---|---|---|---|---|---|
| shapes | 18.2 | 18.3 / 18.2 | 41.27 | 17.67 | 60 | 60 | RNSkia Render 76, RNSkia Present 40 |  |
| shapeBlob | 59.2 | 59.1 / 59.3 | 7.23 | 3.89 | 60 | 60 | RNSkia Render 43, RNSkia Present 23 |  |
| images | 55.4 | 56.9 / 54.0 | 14.07 | 9.29 | 60 | 60 | RNSkia Render 77, RNSkia Present 52 |  |
| shader | 59.3 | 59.2 / 59.4 | 1.15 | 3.89 | 60 | 60 | RNSkia Present 23, RNSkia Render 7 |  |
| pattern | 59.1 | 59.2 / 59.0 | 1.48 | 4.40 | 60 | 60 | RNSkia Present 26, RNSkia Render 9 |  |
| paths | 58.2 | 58.2 / 58.2 | 9.78 | 3.93 | 60 | 60 | RNSkia Render 58, RNSkia Present 23 |  |
| text | 24.7 | 26.0 / 23.3 | 40.08 | 10.54 | 60 | 60 | RNSkia Render 98, RNSkia Present 30 |  |
