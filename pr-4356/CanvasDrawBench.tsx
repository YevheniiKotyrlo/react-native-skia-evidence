import React, { useEffect } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import type { SkCanvas } from "react-native-skia";
import { Skia } from "react-native-skia";

// What a call from JS through a canvas costs: CALLS calls a round, timed in JS,
// the arms taking turns round after round so that drift reaches each alike.
// - raster-drawRect: a 2 × 2 rect on a raster surface's canvas of 16 × 16;
// - recording-drawRect: the same on a picture recorder's canvas;
// - raster-getSaveCount: a call that draws nothing, the canvas's own share.
const CALLS = 20000;
const WARMUP_ROUNDS = 3;
const ROUNDS = 20;
const SETTLE_MS = 3000;

type Arm = "raster-drawRect" | "recording-drawRect" | "raster-getSaveCount";
const ARMS: readonly Arm[] = [
  "raster-drawRect",
  "recording-drawRect",
  "raster-getSaveCount",
];

const mark = (line: string) => console.log(`CANVAS_BENCH ${line}`);

const sleep = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

const paint = Skia.Paint();
const rect = Skia.XYWHRect(1, 1, 2, 2);
const bounds = Skia.XYWHRect(0, 0, 16, 16);

const timeCalls = (canvas: SkCanvas, arm: Arm) => {
  const start = performance.now();
  if (arm === "raster-getSaveCount") {
    for (let call = 0; call < CALLS; call++) {
      canvas.getSaveCount();
    }
  } else {
    for (let call = 0; call < CALLS; call++) {
      canvas.drawRect(rect, paint);
    }
  }
  return performance.now() - start;
};

const timeRound = (arm: Arm) => {
  if (arm === "recording-drawRect") {
    const recorder = Skia.PictureRecorder();
    const milliseconds = timeCalls(recorder.beginRecording(bounds), arm);
    recorder.finishRecordingAsPicture().dispose();
    recorder.dispose();
    return milliseconds;
  }
  const surface = Skia.Surface.MakeRaster(16, 16)!;
  const milliseconds = timeCalls(surface.getCanvas(), arm);
  surface.dispose();
  return milliseconds;
};

const run = async () => {
  mark(`begin os=${Platform.OS} version=${String(Platform.Version)} calls=${CALLS}`);
  await sleep(SETTLE_MS);
  for (let round = -WARMUP_ROUNDS; round < ROUNDS; round++) {
    for (const arm of ARMS) {
      const milliseconds = timeRound(arm);
      if (round >= 0) {
        const nanosecondsPerCall = (milliseconds * 1e6) / CALLS;
        mark(
          `arm=${arm} round=${round} ms=${milliseconds.toFixed(3)} nsPerCall=${nanosecondsPerCall.toFixed(1)}`
        );
      }
    }
    // Lets the collector and the queues run between rounds.
    await sleep(50);
  }
  mark("done");
};

export const CanvasDrawBench = () => {
  useEffect(() => {
    run().catch((error: Error) => mark(`error ${error.message}`));
  }, []);
  return (
    <View style={styles.container}>
      <Text>Canvas draw calls from JS</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center" },
});
