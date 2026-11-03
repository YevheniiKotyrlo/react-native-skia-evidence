import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Canvas, Fill, Skia } from "react-native-skia";

// Installed by the evidence build only (evidence-heap-present.patch,
// RNSkManager.cpp): "prop" reads a system property, "hold-main" and
// "let-main-go" hold the main thread in native code, "fill" exhausts Java's
// heap and "free" lets it go, "wait" sleeps the JS thread in native code, and
// "present-post-join" posts to the present thread's dispatcher from a thread
// of its own, as the trims thread does, and waits for it.
declare global {
  var __skiaProbe: (operation: string, argument?: string | number) => string;
}

// The run script sets the scenario over adb before the launch.
const SCENARIO_PROPERTY = "log.tag.SkiaProbeScenario";
const SETTLE_MS = 3000;
const WAIT_MS = 4000;
// Longer than the trims' idle delay: the present thread's trim comes due
// while Java's heap is still full.
const TRIM_WAIT_MS = 4000;

const mark = (event: string) => {
  console.log(`PRESENT_PROBE ${event} jsNow=${performance.now().toFixed(1)}`);
};

const sleep = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

// The probe's own post, with nothing exhausted: the task runs on the present
// thread.
const controlScenario = async () => {
  mark("control-start");
  globalThis.__skiaProbe("present-post-join", 1);
  await sleep(WAIT_MS);
  mark("done");
};

// A post to the present thread from a thread the JVM has not attached, as the
// trims thread makes it, while Java's heap is full and the main thread held.
const directScenario = async () => {
  mark("direct-start");
  globalThis.__skiaProbe("hold-main");
  const filled = globalThis.__skiaProbe("fill");
  globalThis.__skiaProbe("present-post-join", 1);
  globalThis.__skiaProbe("free");
  globalThis.__skiaProbe("let-main-go");
  mark(`direct-posted filled=${filled}`);
  await sleep(WAIT_MS);
  mark("done");
};

// The trims thread itself: the canvas presents once more on the present
// thread, whose trim comes due the idle delay later, while Java's heap is full.
const trimsScenario = async (redraw: () => void) => {
  mark("trims-start");
  redraw();
  await sleep(300);
  globalThis.__skiaProbe("hold-main");
  const filled = globalThis.__skiaProbe("fill");
  globalThis.__skiaProbe("wait", TRIM_WAIT_MS);
  globalThis.__skiaProbe("free");
  globalThis.__skiaProbe("let-main-go");
  mark(`trims-waited filled=${filled}`);
  await sleep(WAIT_MS);
  mark("done");
};

// The same post to the JS thread, whose binding goes through React Native's
// CallInvoker: first with nothing exhausted, then with Java's heap full.
const jsControlScenario = async () => {
  mark("js-control-start");
  globalThis.__skiaProbe("js-post-join", 1);
  await sleep(WAIT_MS);
  mark("done");
};

const jsDirectScenario = async () => {
  mark("js-direct-start");
  globalThis.__skiaProbe("hold-main");
  const filled = globalThis.__skiaProbe("fill");
  globalThis.__skiaProbe("js-post-join", 1);
  globalThis.__skiaProbe("free");
  globalThis.__skiaProbe("let-main-go");
  mark(`js-direct-posted filled=${filled}`);
  await sleep(WAIT_MS);
  mark("done");
};

// The trims thread posting the JS thread's trim: the JS thread draws into an
// offscreen surface and lets go of it, and the trim comes due the idle delay
// later, while Java's heap is full.
const jsTrimsScenario = async () => {
  mark("js-trims-start");
  const surface = Skia.Surface.MakeOffscreen(64, 64)!;
  surface.getCanvas().clear(Skia.Color("cyan"));
  surface.flush();
  surface.dispose();
  globalThis.__skiaProbe("hold-main");
  const filled = globalThis.__skiaProbe("fill");
  globalThis.__skiaProbe("wait", TRIM_WAIT_MS);
  globalThis.__skiaProbe("free");
  globalThis.__skiaProbe("let-main-go");
  mark(`js-trims-waited filled=${filled}`);
  await sleep(WAIT_MS);
  mark("done");
};

// A post to the JS thread from a thread of its own while the JS thread idles,
// as the trims thread posts the JS thread's trim: React Native wakes an idle
// JS thread through Java. The task it posts frees the heap, lets the main
// thread go and logs the probe's end; nothing here waits on a timer while the
// heap is full.
const jsIdleScenario = () => {
  mark("js-idle-start");
  globalThis.__skiaProbe("hold-main");
  const filled = globalThis.__skiaProbe("fill");
  globalThis.__skiaProbe("js-post-later", 1500);
  mark(`js-idle-filled filled=${filled}`);
};

export const PresentPostProbe = () => {
  const [color, setColor] = useState("cyan");
  useEffect(() => {
    const redraw = () => setColor("magenta");
    const run = async () => {
      await sleep(SETTLE_MS);
      const scenario = globalThis.__skiaProbe("prop", SCENARIO_PROPERTY);
      mark(`scenario ${scenario}`);
      if (scenario === "control") {
        await controlScenario();
      } else if (scenario === "direct") {
        await directScenario();
      } else if (scenario === "trims") {
        await trimsScenario(redraw);
      } else if (scenario === "js-control") {
        await jsControlScenario();
      } else if (scenario === "js-direct") {
        await jsDirectScenario();
      } else if (scenario === "js-trims") {
        await jsTrimsScenario();
      } else if (scenario === "js-idle") {
        jsIdleScenario();
      } else {
        mark(`error unknown scenario ${scenario}`);
      }
    };
    run().catch((error: Error) => mark(`error ${error.message}`));
  }, []);
  return (
    <View style={styles.container}>
      <Canvas style={styles.canvas}>
        <Fill color={color} />
      </Canvas>
      <Text>Present thread post probe</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center" },
  canvas: { width: 120, height: 120 },
});
