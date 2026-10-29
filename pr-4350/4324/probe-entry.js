// Evidence only: the bundle entry for the display-link tick probe. One canvas animates on every UI frame at the top of
// a scroll view; it is shown mounted, then taken out of its superview by clipping and brought back, then unmounted and
// mounted again into a view Fabric recycled, each phase long enough for several one-second tick readings
// (add-tick-counter.py). Each display link the phases stop writes a stop line, which divides the readings.
import "react-native-skia";
import React, { useEffect, useRef, useState } from "react";
import { AppRegistry, ScrollView, View } from "react-native";
import { Canvas, Fill, Rect } from "react-native-skia";
import {
  useDerivedValue,
  useFrameCallback,
  useSharedValue,
} from "react-native-reanimated";

import { name as appName } from "./app.json";

const PHASE_MS = 5000;
const ROW_HEIGHT = 1000;
const AWAY = 4 * ROW_HEIGHT;

const Moving = () => {
  const time = useSharedValue(0);
  useFrameCallback((frame) => {
    time.value = frame.timeSinceFirstFrame;
  });
  const x = useDerivedValue(() => (time.value / 4) % 600);
  return (
    <Canvas style={{ flex: 1 }}>
      <Fill color="white" />
      <Rect x={x} y={200} width={120} height={120} color="cyan" />
    </Canvas>
  );
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const Probe = () => {
  const scrollView = useRef(null);
  const [clipped, setClipped] = useState(false);
  const [mounted, setMounted] = useState(true);
  const [generation, setGeneration] = useState(0);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await wait(PHASE_MS);
      setClipped(true);
      await wait(500);
      scrollView.current?.scrollTo({ y: AWAY, animated: false });
      await wait(1000);
      scrollView.current?.scrollTo({ y: 0, animated: false });
      await wait(PHASE_MS);
      setMounted(false);
      await wait(1000);
      if (!cancelled) {
        setGeneration(1);
        setMounted(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return (
    <ScrollView
      ref={scrollView}
      removeClippedSubviews={clipped}
      style={{ flex: 1 }}
    >
      <View style={{ height: ROW_HEIGHT }}>
        {mounted ? <Moving key={generation} /> : null}
      </View>
      <View style={{ height: 2 * AWAY }} />
    </ScrollView>
  );
};

AppRegistry.registerComponent(appName, () => Probe);
