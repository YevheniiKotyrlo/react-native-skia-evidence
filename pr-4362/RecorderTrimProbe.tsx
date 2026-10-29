import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { CanvasRef, SkImage, SkSurface } from "react-native-skia";
import {
  Canvas,
  Fill,
  FilterMode,
  MipmapMode,
  Skia,
  TileMode,
  drawAsImage,
} from "react-native-skia";
import {
  createWorkletRuntime,
  scheduleOnRuntime,
  scheduleOnUI,
} from "react-native-worklets";

// Evidence only, for contribution 539: the GPU memory a thread's recorder keeps once its surfaces are gone. Each step
// logs `TRIM mark=<step>` and holds still, so that the dump the runner takes on the marker lands inside the hold.

const surfaceCount = 20;
const surfaceSide = 2048;
const settleMilliseconds = 8000;
const holdMilliseconds = 4000;
const afterDisposeMilliseconds = 5000;
const longWaitMilliseconds = 30000;
const repeatRounds = 10;
const submitRounds = 21;
const submitsPerRound = 200;

const makeSurfaces = (count: number, side: number): SkSurface[] => {
  "worklet";
  const surfaces: SkSurface[] = [];
  for (let index = 0; index < count; index++) {
    const surface = Skia.Surface.MakeOffscreen(side, side);
    if (surface === null) {
      throw new Error(`no ${side} × ${side} offscreen surface`);
    }
    surface.getCanvas().clear(Skia.Color("cyan"));
    surface.flush();
    surfaces.push(surface);
  }
  return surfaces;
};

const makeAndDisposeSurfaces = (count: number, side: number) => {
  "worklet";
  for (const surface of makeSurfaces(count, side)) {
    surface.dispose();
  }
};

// A worklet runtime keeps its surfaces on its own global between two calls.
const keepSurfaces = (count: number, side: number) => {
  "worklet";
  try {
    (globalThis as Record<string, unknown>).__recorderTrimProbe = makeSurfaces(
      count,
      side
    );
  } catch (error) {
    console.log(`TRIM error in a worklet: ${String(error)}`);
  }
};

const disposeKeptSurfaces = () => {
  "worklet";
  const global = globalThis as Record<string, unknown>;
  const kept = global.__recorderTrimProbe as SkSurface[] | undefined;
  if (kept === undefined) {
    console.log("TRIM error in a worklet: no surfaces kept");
    return;
  }
  for (const surface of kept) {
    surface.dispose();
  }
  global.__recorderTrimProbe = undefined;
};

const wait = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

// What a GPU submit costs the JS thread: a clear and a flush of a small surface, per call, in each of the rounds.
const logSubmitCost = () => {
  const surface = Skia.Surface.MakeOffscreen(32, 32);
  if (surface === null) {
    console.log("TRIM error: no surface to submit with");
    return;
  }
  const microsecondsPerCall: number[] = [];
  for (let round = 0; round < submitRounds; round++) {
    const start = performance.now();
    for (let call = 0; call < submitsPerRound; call++) {
      surface.getCanvas().clear(Skia.Color("cyan"));
      surface.flush();
    }
    microsecondsPerCall.push(((performance.now() - start) * 1000) / submitsPerRound);
  }
  surface.dispose();
  const sorted = [...microsecondsPerCall].sort((left, right) => left - right);
  console.log(
    `TRIM submit-cost rounds=${submitRounds} calls=${submitsPerRound} ` +
      `medianMicroseconds=${sorted[Math.floor(sorted.length / 2)].toFixed(1)} ` +
      `lowMicroseconds=${sorted[0].toFixed(1)} highMicroseconds=${sorted[sorted.length - 1].toFixed(1)}`
  );
};

// What probe-memory.patch adds to Skia.gpu for the probe's builds: the calling
// thread's recorders, and Dawn's account of the device, once it gave back what
// it caches when `reduce` is true.
interface ProbeMemory {
  rounds: number;
  recorderBudgeted: number;
  recorderPurgeable: number;
  allocatorAllocated: number;
  allocatorUsed: number;
  textures: number;
}

// The JS thread draws a small surface on every frame until the returned function is called.
const drawEveryFrame = () => {
  const surface = Skia.Surface.MakeOffscreen(64, 64);
  if (surface === null) {
    throw new Error("no 64 × 64 offscreen surface");
  }
  let drawing = true;
  const frame = () => {
    if (!drawing) {
      surface.dispose();
      return;
    }
    surface.getCanvas().clear(Skia.Color("magenta"));
    surface.flush();
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  return () => {
    drawing = false;
  };
};

const disposeOnUI = (surfaces: SkSurface[]) => {
  "worklet";
  for (const surface of surfaces) {
    surface.dispose();
  }
};

// The UI runtime takes asImage() images of surfaces another thread made, and keeps them on its own global.
const shareOnUI = (surfaces: SkSurface[]) => {
  "worklet";
  (globalThis as Record<string, unknown>).__recorderTrimShared = surfaces.map(
    (surface) => surface.asImage()
  );
};

const disposeSharedOnUI = () => {
  "worklet";
  const global = globalThis as Record<string, unknown>;
  const shared = global.__recorderTrimShared as SkImage[] | undefined;
  if (shared === undefined) {
    console.log("TRIM error in a worklet: no images kept");
    return;
  }
  for (const image of shared) {
    image.dispose();
  }
  global.__recorderTrimShared = undefined;
};

// Garbage for Hermes to collect, so that what was let go of without dispose() is collected.
const makeGarbage = () => {
  let kept = 0;
  for (let round = 0; round < 40; round++) {
    const garbage: number[][] = [];
    for (let index = 0; index < 50000; index++) {
      garbage.push([index, round]);
    }
    kept += garbage.length;
  }
  return kept;
};

const logMemory = (step: string, thread: string, reduce: boolean) => {
  "worklet";
  const gpu = Skia.gpu as unknown as {
    __memory?: (reduce: boolean) => ProbeMemory | null;
  };
  const memory = gpu.__memory?.(reduce) ?? null;
  if (memory === null) {
    console.log(`TRIM memory step=${step} thread=${thread} unavailable`);
    return;
  }
  console.log(
    `TRIM memory step=${step} thread=${thread} rounds=${memory.rounds} ` +
      `recorderBudgeted=${memory.recorderBudgeted} ` +
      `recorderPurgeable=${memory.recorderPurgeable} ` +
      `dawnAllocated=${memory.allocatorAllocated} ` +
      `dawnUsed=${memory.allocatorUsed} textures=${memory.textures}`
  );
};

const runProbe = async (
  showStep: (step: string) => void,
  canvas: React.RefObject<CanvasRef | null>
) => {
  const step = async (name: string) => {
    showStep(name);
    console.log(`TRIM mark=${name}`);
    await wait(holdMilliseconds);
  };
  // Dawn gives back what it caches, and the step after it is read once it did.
  const reduced = async (name: string) => {
    logMemory(name, "js", true);
    await step(name);
  };
  await wait(settleMilliseconds);
  logMemory("baseline", "js", false);
  await step("baseline");

  const alive = makeSurfaces(surfaceCount, surfaceSide);
  await step("js-alive");
  for (const surface of alive) {
    surface.dispose();
  }
  await wait(afterDisposeMilliseconds);
  logMemory("js-disposed-5s", "js", false);
  await step("js-disposed-5s");
  await wait(longWaitMilliseconds);
  await step("js-disposed-40s");
  await reduced("js-reduced");

  scheduleOnUI(keepSurfaces, surfaceCount, surfaceSide);
  await wait(afterDisposeMilliseconds);
  await step("ui-alive");
  scheduleOnUI(disposeKeptSurfaces);
  await wait(afterDisposeMilliseconds);
  scheduleOnUI(logMemory, "ui-disposed-5s", "ui", false);
  await step("ui-disposed-5s");
  await reduced("ui-reduced");

  const workerRuntime = createWorkletRuntime({ name: "recorder-trim-probe" });
  scheduleOnRuntime(workerRuntime, keepSurfaces, surfaceCount, surfaceSide);
  await wait(afterDisposeMilliseconds);
  await step("worker-alive");
  scheduleOnRuntime(workerRuntime, disposeKeptSurfaces);
  await wait(afterDisposeMilliseconds);
  scheduleOnRuntime(workerRuntime, logMemory, "worker-disposed-5s", "worker", false);
  await step("worker-disposed-5s");
  await reduced("worker-reduced");
  scheduleOnRuntime(workerRuntime, makeAndDisposeSurfaces, 1, 1);
  await wait(afterDisposeMilliseconds);
  scheduleOnRuntime(workerRuntime, logMemory, "worker-next-use-5s", "worker", false);
  await step("worker-next-use-5s");
  await reduced("worker-next-use-reduced");

  for (let round = 1; round <= repeatRounds; round++) {
    makeAndDisposeSurfaces(surfaceCount, surfaceSide);
    await wait(afterDisposeMilliseconds);
    await step(`js-repeat-${round}`);
  }
  await reduced("js-repeat-reduced");
  logSubmitCost();

  // A thread that keeps drawing while what it made goes.
  const stopDrawing = drawEveryFrame();
  for (const surface of makeSurfaces(surfaceCount, surfaceSide)) {
    surface.dispose();
  }
  await wait(afterDisposeMilliseconds);
  logMemory("js-drawing-disposed-5s", "js", false);
  await step("js-drawing-disposed-5s");
  stopDrawing();
  await wait(afterDisposeMilliseconds);
  logMemory("js-drawing-stopped-5s", "js", false);
  await step("js-drawing-stopped-5s");
  await reduced("js-drawing-reduced");

  // Made on the JS thread, let go of on the UI runtime.
  scheduleOnUI(disposeOnUI, makeSurfaces(surfaceCount, surfaceSide));
  await wait(afterDisposeMilliseconds);
  logMemory("js-disposed-on-ui-5s", "js", false);
  await step("js-disposed-on-ui-5s");
  await reduced("js-disposed-on-ui-reduced");

  // asImage() images outliving their surfaces.
  const sharing = makeSurfaces(surfaceCount, surfaceSide);
  const shared: SkImage[] = sharing.map((surface) => surface.asImage());
  for (const surface of sharing) {
    surface.dispose();
  }
  await wait(afterDisposeMilliseconds);
  logMemory("js-shared-kept-5s", "js", false);
  await step("js-shared-kept-5s");
  for (const image of shared) {
    image.dispose();
  }
  await wait(afterDisposeMilliseconds);
  logMemory("js-shared-disposed-5s", "js", false);
  await step("js-shared-disposed-5s");
  await reduced("js-shared-reduced");

  // asImage() images the UI runtime takes of the JS thread's surfaces, outliving them.
  const sharedFromUI = makeSurfaces(surfaceCount, surfaceSide);
  scheduleOnUI(shareOnUI, sharedFromUI);
  await wait(holdMilliseconds);
  for (const surface of sharedFromUI) {
    surface.dispose();
  }
  await wait(afterDisposeMilliseconds);
  scheduleOnUI(disposeSharedOnUI);
  await wait(afterDisposeMilliseconds);
  logMemory("js-shared-on-ui-disposed-5s", "js", false);
  await step("js-shared-on-ui-disposed-5s");
  await reduced("js-shared-on-ui-reduced");

  // Snapshots taken into images made with MakeNull().
  const snapshotted = makeSurfaces(surfaceCount, surfaceSide);
  const outputs = snapshotted.map((surface) => {
    const output = Skia.Image.MakeNull();
    surface.makeImageSnapshot(undefined, output);
    return output;
  });
  for (const surface of snapshotted) {
    surface.dispose();
  }
  await wait(afterDisposeMilliseconds);
  for (const output of outputs) {
    output.dispose();
  }
  await wait(afterDisposeMilliseconds);
  logMemory("js-snapshots-disposed-5s", "js", false);
  await step("js-snapshots-disposed-5s");
  await reduced("js-snapshots-reduced");

  // Snapshots a shader holds on to once the images are disposed.
  const shaded = makeSurfaces(surfaceCount, surfaceSide);
  const shaders = shaded.map((surface) => {
    const snapshot = surface.makeImageSnapshot();
    const shader = snapshot.makeShaderOptions(
      TileMode.Clamp,
      TileMode.Clamp,
      FilterMode.Linear,
      MipmapMode.None
    );
    snapshot.dispose();
    return shader;
  });
  for (const surface of shaded) {
    surface.dispose();
  }
  await wait(afterDisposeMilliseconds);
  logMemory("js-shaders-kept-5s", "js", false);
  await step("js-shaders-kept-5s");
  for (const shader of shaders) {
    shader.dispose();
  }
  await wait(afterDisposeMilliseconds * 3);
  logMemory("js-shaders-disposed-15s", "js", false);
  await step("js-shaders-disposed-15s");
  await reduced("js-shaders-reduced");

  // Snapshots of a mounted canvas.
  const view = canvas.current;
  if (view === null) {
    console.log("TRIM error: no canvas to snapshot");
  } else {
    for (let index = 0; index < surfaceCount; index++) {
      view.makeImageSnapshot().dispose();
    }
  }
  await wait(afterDisposeMilliseconds);
  logMemory("js-view-snapshots-5s", "js", false);
  await step("js-view-snapshots-5s");
  await reduced("js-view-snapshots-reduced");

  // drawAsImage(): its surface and its snapshot are left to the collector.
  for (let index = 0; index < surfaceCount; index++) {
    (await drawAsImage(<Fill color="cyan" />, { width: surfaceSide, height: surfaceSide })).dispose();
  }
  console.log(`TRIM garbage ${makeGarbage()}`);
  await wait(afterDisposeMilliseconds);
  logMemory("js-collected-5s", "js", false);
  await step("js-collected-5s");
  await reduced("js-collected-reduced");

  console.log("TRIM mark=done");
  showStep("done");
};

export const RecorderTrimProbe = () => {
  const [currentStep, setCurrentStep] = useState("starting");
  const canvas = useRef<CanvasRef>(null);
  useEffect(() => {
    runProbe(setCurrentStep, canvas).catch((error: unknown) => {
      console.log(`TRIM error ${String(error)}`);
      setCurrentStep(`error: ${String(error)}`);
    });
  }, []);
  return (
    <View style={styles.container}>
      <Canvas ref={canvas} style={styles.canvas}>
        <Fill color="yellow" />
      </Canvas>
      <Text style={styles.step}>{currentStep}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "white",
  },
  step: { fontSize: 24, color: "black" },
  canvas: { width: 512, height: 512 },
});
