# `main` with #4366 on the Android 10 and 11 emulator images

Evidence only. `main` is `d4a36ca4a`, with #4366. The launches and the device loss use the example's x86_64 release builds, the reloads its debug build, the one React Native reloads.

- `launch/`: the launch check (`../launch-alive.sh`) on the Android 10 (API 29) and Android 11 (API 30) images, three launches to the home screen and three to Android Views. Every launch stays alive.
- `device-loss/`: `Gpu.spec` on both images: jest's report, the app's lines about its device with the thread each came from (pid, tid), and the tombstone. The replacement is made on a thread of its own, and the JS thread's next GPU call dies in `syncEncodersForCommandBuffer`. On Android 10 the e2e build outgrows the image's default heap growth limit at launch, so that run set `dalvik.vm.heapgrowthlimit` to 64m and restarted the framework first.
- `reload/`: `reload-alive.sh` on both images. The home screen, which draws no canvas, runs until the JS thread has made the device, then Breathe opens: three times straight, and three times after a reload (React Native's `<package>.RELOAD_APP_ACTION` broadcast, which ends the JS thread). The table gives the thread each device was made on, when each reload began, and when the app died; then the first crash's tombstone.
- `reload-alive.sh`: the reload check.

To rerun the reloads, bundle the example in `apps/example` (`npx react-native bundle --platform android --dev false --entry-file index.js --bundle-output dist/main.android.jsbundle --assets-dest dist/res`), build its debug APK for x86_64 in `apps/example/android` (`./gradlew assembleDebug -PreactNativeArchitectures=x86_64`), start an Android 10 or 11 emulator image, and run `bash reload-alive.sh <serial> 3 <folder> <apk> breathe` with `ANDROID_HOME` set.
