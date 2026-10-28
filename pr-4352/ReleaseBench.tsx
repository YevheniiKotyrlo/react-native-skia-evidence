import React, { useEffect, useMemo, useState } from "react";
import { PixelRatio, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import type { CanvasRef } from "react-native-webgpu";
import { Canvas as GpuCanvas, importDevice } from "react-native-webgpu";
import type { SkImage } from "react-native-skia";
import { Blur, Canvas, Image, Skia } from "react-native-skia";

// Evidence only: mounts and unmounts 120 views per arm,
// counting the UI thread's missed frames in windows of WINDOW_CYCLES cycles,
// then logs Dawn's account of the device's memory once the device idled, as
// held and once the probe asks Dawn to give back what it keeps for reuse
// (dawn-memory.patch). Each "BENCH memory-unmounted" line marks where
// meminfo is read. The canvas-webgpu arm draws a WebGPU triangle on Skia's own
// device every frame, through the arm and its settle, as the example's
// WebGPU screens do.

type Arm = "none" | "canvas" | "canvas-blur" | "canvas-webgpu";

const isArm = (name: string): name is Arm =>
  name === "none" ||
  name === "canvas" ||
  name === "canvas-blur" ||
  name === "canvas-webgpu";

const ARMS: readonly Arm[] = (
  process.env.BENCH_ARMS ?? "none canvas canvas-blur none"
)
  .split(" ")
  .filter(isArm);
const CYCLES = Number(process.env.BENCH_CYCLES ?? "96");
const COUNT = 120;
const CELL = 40;
const MOUNTED_MS = 500;
const UNMOUNTED_MS = 100;
// 16 cycles of 600 ms: the 9.6 s windows #4328's bench counted missed frames in.
const WINDOW_CYCLES = 16;
// Past the render pool's idle task (2 s after the last view goes), the
// release's idle time (1 s) and its rounds, and long enough for a dump taken
// over adb at a marker to land inside it.
const SETTLE_MS = 8000;
const DUMP_MS = 3000;

// Set when the bundle is made for a device whose log the host cannot read,
// such as an iOS device reached over Wi-Fi only: every line is posted there too.
const REPORT_URL = process.env.BENCH_REPORT_URL;
let pendingReport: Promise<unknown> = Promise.resolve();

const logMarker = (event: string, detail: string) => {
  const line = `BENCH ${event} ${detail} jsNow=${performance.now().toFixed(1)}`;
  console.log(line);
  if (REPORT_URL !== undefined && REPORT_URL !== "") {
    pendingReport = pendingReport
      .then(() => fetch(REPORT_URL, { method: "POST", body: line }))
      .catch(() => undefined);
  }
};

const sleep = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

interface FrameReport {
  readonly window: string;
  readonly frames: number;
  readonly periodMs: number;
  readonly missedFrames: number;
  readonly maxGapMs: number;
  readonly durationMs: number;
}

const reportFrames = (report: FrameReport) => {
  logMarker(
    "frames",
    `window=${report.window} frames=${report.frames} periodMs=${report.periodMs.toFixed(
      2
    )} missedFrames=${report.missedFrames} maxGapMs=${report.maxGapMs.toFixed(
      1
    )} durationMs=${report.durationMs.toFixed(0)}`
  );
};

// As #4328's bench counts them: a missed frame is a display frame in which
// Reanimated's frame callback did not run, the period the median gap. The UI
// thread reads one command a frame, so two commands the JS thread sets in one
// turn keep only the second: "cut" ends a window and starts the next at once.
const useFrameProbe = () => {
  const command = useSharedValue<string>("idle");
  const active = useSharedValue(false);
  const last = useSharedValue(0);
  const gaps = useSharedValue<number[]>([]);
  useFrameCallback((frame) => {
    const now = frame.timestamp;
    const order = command.value;
    if (order === "start") {
      command.value = "idle";
      active.value = true;
      last.value = now;
      gaps.value = [];
      return;
    }
    if (!active.value) {
      return;
    }
    const gap = now - last.value;
    last.value = now;
    gaps.modify((list) => {
      "worklet";
      list.push(gap);
      return list;
    }, false);
    const ends = order.startsWith("dump ") || order.startsWith("cut ");
    if (ends) {
      const continues = order.startsWith("cut ");
      command.value = "idle";
      active.value = continues;
      const list = gaps.value;
      if (continues) {
        gaps.value = [];
      }
      const sorted = [...list].sort((left, right) => left - right);
      const period = sorted[Math.floor(sorted.length / 2)] ?? 0;
      let durationMs = 0;
      let maxGap = 0;
      for (const value of list) {
        durationMs += value;
        maxGap = Math.max(maxGap, value);
      }
      const missedFrames =
        period > 0
          ? Math.max(0, Math.round(durationMs / period) - list.length)
          : 0;
      scheduleOnRN(reportFrames, {
        window: order.slice(order.indexOf(" ") + 1),
        frames: list.length,
        periodMs: period,
        missedFrames,
        maxGapMs: maxGap,
        durationMs,
      });
    }
  });
  return useMemo(
    () => ({
      start: () => {
        command.value = "start";
      },
      dump: (window: string) => {
        command.value = `dump ${window}`;
      },
      cut: (window: string) => {
        command.value = `cut ${window}`;
      },
    }),
    [command]
  );
};

// Turned on the UI thread throughout, as in #4328's bench: it holds the display
// at its full rate, so a missed frame is one of that rate.
const Spinner = () => {
  const rotation = useSharedValue(0);
  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 1000, easing: Easing.linear }),
      -1
    );
  }, [rotation]);
  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));
  return <Animated.View style={[styles.spinner, style]} />;
};

const TRIANGLE_SHADER = /* wgsl */ `
@vertex
fn vs_main(@builtin(vertex_index) vertexIndex: u32) -> @builtin(position) vec4f {
  var pos = array<vec2f, 3>(vec2f(0.0, 0.5), vec2f(-0.5, -0.5), vec2f(0.5, -0.5));
  return vec4f(pos[vertexIndex], 0.0, 1.0);
}

@fragment
fn fs_main() -> @location(0) vec4f {
  return vec4f(1.0, 0.5, 0.2, 1.0);
}
`;

// The example's WebGPU triangle (Examples/WebGPU/Triangle.tsx) without its
// multisampling, on the device Skia renders with, one frame a display frame.
const WebGpuTriangle = () => {
  const ref = React.useRef<CanvasRef>(null);
  useEffect(() => {
    let running = true;
    let frame = 0;
    const device = importDevice(Skia.getNativeDevice());
    const context = ref.current?.getContext("webgpu");
    if (!context) {
      logMarker("webgpu", "no-context");
      return;
    }
    const format = navigator.gpu.getPreferredCanvasFormat();
    context.configure({ device, format, alphaMode: "opaque" });
    const module = device.createShaderModule({ code: TRIANGLE_SHADER });
    const pipeline = device.createRenderPipeline({
      layout: "auto",
      vertex: { module, entryPoint: "vs_main" },
      fragment: { module, entryPoint: "fs_main", targets: [{ format }] },
      primitive: { topology: "triangle-list" },
    });
    const render = () => {
      if (!running) {
        return;
      }
      const encoder = device.createCommandEncoder();
      const pass = encoder.beginRenderPass({
        colorAttachments: [
          {
            view: context.getCurrentTexture().createView(),
            clearValue: { r: 0.1, g: 0.1, b: 0.1, a: 1.0 },
            loadOp: "clear",
            storeOp: "store",
          },
        ],
      });
      pass.setPipeline(pipeline);
      pass.draw(3);
      pass.end();
      device.queue.submit([encoder.finish()]);
      context.present();
      frame = requestAnimationFrame(render);
    };
    logMarker("webgpu", "drawing");
    frame = requestAnimationFrame(render);
    return () => {
      running = false;
      cancelAnimationFrame(frame);
    };
  }, []);
  return <GpuCanvas ref={ref} style={styles.webgpu} />;
};

const bakeImage = (size: number): SkImage => {
  const surface = Skia.Surface.MakeRaster(size, size);
  if (surface === null) {
    throw new Error("no raster surface");
  }
  const paint = Skia.Paint();
  paint.setShader(
    Skia.Shader.MakeLinearGradient(
      { x: 0, y: 0 },
      { x: size, y: size },
      [Skia.Color("#ff3b30"), Skia.Color("#48dbfb"), Skia.Color("#feca57")],
      null,
      0
    )
  );
  surface.getCanvas().drawPaint(paint);
  return surface.makeImageSnapshot();
};

const CellContent = ({ arm, image }: { arm: Arm; image: SkImage }) => {
  const style = { width: CELL, height: CELL };
  switch (arm) {
    case "none":
      return <View style={[style, styles.plain]} />;
    case "canvas":
    case "canvas-webgpu":
      return (
        <Canvas style={style}>
          <Image image={image} x={0} y={0} width={CELL} height={CELL} />
        </Canvas>
      );
    case "canvas-blur":
      return (
        <Canvas style={style}>
          <Image image={image} x={0} y={0} width={CELL} height={CELL}>
            <Blur blur={4} />
          </Image>
        </Canvas>
      );
  }
};

const Cell = React.memo(CellContent);

interface CycleState {
  readonly arm: Arm;
  readonly index: number;
  readonly mounted: boolean;
}

export const ReleaseBench = () => {
  const [image] = useState(() =>
    bakeImage(Math.round(CELL * PixelRatio.get()))
  );
  const [state, setState] = useState<CycleState | "done">({
    arm: ARMS[0],
    index: 0,
    mounted: false,
  });
  const probe = useFrameProbe();

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      for (const [index, arm] of ARMS.entries()) {
        const name = `${index}-${arm}`;
        await sleep(SETTLE_MS);
        logMarker("memory-unmounted", `arm=${name}-before pass=0`);
        await sleep(DUMP_MS);
        const started = performance.now();
        probe.start();
        for (let cycle = 0; cycle < CYCLES && !cancelled; cycle++) {
          setState({ arm, index, mounted: true });
          await sleep(MOUNTED_MS);
          setState({ arm, index, mounted: false });
          await sleep(UNMOUNTED_MS);
          if (cycle % WINDOW_CYCLES === WINDOW_CYCLES - 1) {
            probe.cut(`${name}-cycles-${Math.floor(cycle / WINDOW_CYCLES)}`);
          }
        }
        logMarker(
          "cycles",
          `arm=${name} cycles=${CYCLES} durationMs=${(
            performance.now() - started
          ).toFixed(0)}`
        );
        // The last window's cut reaches the UI thread before the settle starts
        // its own; the release runs in this settle, once the views are gone.
        await sleep(UNMOUNTED_MS);
        probe.start();
        await sleep(SETTLE_MS);
        probe.dump(`${name}-settle`);
        logMarker("memory-unmounted", `arm=${name}-after pass=0`);
        await sleep(DUMP_MS);
        const gpu = Skia.gpu as unknown as {
          __memory?: (reduce: boolean) => unknown;
        };
        logMarker(
          "dawn",
          `arm=${name} phase=held ${JSON.stringify(gpu.__memory?.(false))}`
        );
        logMarker(
          "dawn",
          `arm=${name} phase=reduced ${JSON.stringify(gpu.__memory?.(true))}`
        );
        logMarker("memory-unmounted", `arm=${name}-reduced pass=0`);
        await sleep(SETTLE_MS);
      }
      logMarker("done", `cycles=${CYCLES}`);
      setState("done");
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [probe]);

  if (state === "done") {
    return (
      <View style={styles.container}>
        <Text style={styles.label}>done</Text>
      </View>
    );
  }
  const { arm, index, mounted } = state;
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>{`${index}-${arm}`}</Text>
        <Spinner />
        {arm === "canvas-webgpu" ? <WebGpuTriangle /> : null}
      </View>
      <View style={styles.grid}>
        {mounted
          ? Array.from({ length: COUNT }, (_, cell) => (
              <Cell key={cell} arm={arm} image={image} />
            ))
          : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "white", paddingTop: 48 },
  header: { flexDirection: "row", alignItems: "center" },
  label: { fontSize: 16, padding: 12 },
  spinner: { width: 24, height: 24, borderRadius: 4, backgroundColor: "#ff3b30" },
  webgpu: { width: 96, height: 96, marginLeft: 12 },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 12,
    gap: 4,
  },
  plain: { backgroundColor: "#48dbfb", borderRadius: 10 },
});
