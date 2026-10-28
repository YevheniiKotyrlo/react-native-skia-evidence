import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { SharedValue } from "react-native-reanimated";
import { useDerivedValue } from "react-native-reanimated";
import { Canvas, Circle, Fill, Group, useClock } from "react-native-skia";

interface CensusConfig {
  readonly name: string;
  readonly canvases: number;
  readonly shapes: number;
  readonly opaque: boolean;
}

const PACING_SHAPES = [100, 1000, 2000, 4000, 6000, 8000, 12000, 16000];
const CANVAS_COUNTS = [1, 2, 4, 8];
const OPAQUE_CANVAS_COUNTS = [1, 2, 4];
const OPAQUE_PACING_SHAPES = [4000, 8000, 12000];
const HOLD_MS = 16000;
const GRID_COLUMNS = 100;
const GRID_STEP = 4;

const CONFIGS: readonly CensusConfig[] = [
  ...PACING_SHAPES.map((shapes) => ({
    name: `pacing-${shapes}`,
    canvases: 1,
    shapes,
    opaque: false,
  })),
  ...CANVAS_COUNTS.map((canvases) => ({
    name: `canvases-${canvases}`,
    canvases,
    shapes: 1,
    opaque: false,
  })),
  ...OPAQUE_CANVAS_COUNTS.map((canvases) => ({
    name: `opaque-canvases-${canvases}`,
    canvases,
    shapes: 1,
    opaque: true,
  })),
  ...OPAQUE_PACING_SHAPES.map((shapes) => ({
    name: `opaque-pacing-${shapes}`,
    canvases: 1,
    shapes,
    opaque: true,
  })),
];

interface ShapesSceneProps {
  readonly clock: SharedValue<number>;
  readonly shapes: number;
  readonly opaque: boolean;
}

const ShapesScene = ({ clock, shapes, opaque }: ShapesSceneProps) => {
  const positions = useMemo(
    () =>
      Array.from({ length: shapes }, (_, index) => ({
        x: GRID_STEP + (index % GRID_COLUMNS) * GRID_STEP,
        y: GRID_STEP + Math.floor(index / GRID_COLUMNS) * GRID_STEP,
      })),
    [shapes]
  );
  const transform = useDerivedValue(() => [
    { translateX: 20 * Math.sin(clock.value / 300) },
  ]);
  return (
    <Canvas style={styles.fill} opaque={opaque}>
      <Fill color="black" />
      <Group transform={transform}>
        {positions.map((position, index) => (
          <Circle
            key={index}
            cx={position.x}
            cy={position.y}
            r={1.5}
            color="white"
          />
        ))}
      </Group>
    </Canvas>
  );
};

interface CircleCanvasProps {
  readonly clock: SharedValue<number>;
  readonly opaque: boolean;
  readonly phase: number;
}

const CircleCanvas = ({ clock, opaque, phase }: CircleCanvasProps) => {
  const cx = useDerivedValue(
    () => 100 + 60 * Math.sin(clock.value / 500 + phase)
  );
  return (
    <Canvas style={styles.fill} opaque={opaque}>
      <Fill color="#334" />
      <Circle cx={cx} cy={30} r={20} color="white" />
    </Canvas>
  );
};

export const FrameRateCensus = () => {
  const clock = useClock();
  const [index, setIndex] = useState(0);
  const config = CONFIGS[index];
  useEffect(() => {
    if (config === undefined) {
      console.log("CENSUS done");
      return undefined;
    }
    console.log(
      `CENSUS start ${config.name} canvases=${config.canvases} shapes=${config.shapes} opaque=${config.opaque}`
    );
    const timer = setTimeout(() => setIndex((current) => current + 1), HOLD_MS);
    return () => clearTimeout(timer);
  }, [config]);
  if (config === undefined) {
    return (
      <View style={styles.fill}>
        <Text style={styles.label}>done</Text>
      </View>
    );
  }
  return (
    <View style={styles.fill} key={config.name}>
      <Text style={styles.label}>{config.name}</Text>
      {config.shapes > 1 ? (
        <ShapesScene
          clock={clock}
          shapes={config.shapes}
          opaque={config.opaque}
        />
      ) : (
        Array.from({ length: config.canvases }, (_, canvasIndex) => (
          <CircleCanvas
            key={canvasIndex}
            clock={clock}
            opaque={config.opaque}
            phase={canvasIndex}
          />
        ))
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  label: {
    padding: 4,
  },
});
