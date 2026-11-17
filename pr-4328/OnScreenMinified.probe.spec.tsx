import { execSync } from "child_process";
import { join } from "path";

import { readMiddleLuminance, surface } from "../setup";

// The display as the device composites it: the screen snapshot draws the layers on the CPU
// (drawViewHierarchyInRect), which leaves Core Animation's filters out. CAPTURE_DISPLAY is a command that writes the
// device's screen to the path appended to it, such as `pymobiledevice3 developer dvt screenshot`; read-display.mjs
// reads the test screen's middle in the capture.
const captureDisplay = (screen: string) => {
  const command = process.env.CAPTURE_DISPLAY;
  const output = process.env.PROBE_OUTPUT;
  if (!command || !output) {
    throw new Error("CAPTURE_DISPLAY names the capture command and PROBE_OUTPUT the folder for the captures");
  }
  const path = join(output, `${screen}.png`);
  execSync(`${command} "${path}"`, { stdio: "inherit" });
  return path;
};

describe("SkiaImageView on-screen probe", () => {
  it.each(["ImageViewMinified", "ImageViewMinifiedOdd"])("captures %s as the display shows it", async (screen) => {
    const snapshot = await surface.screen(screen);
    const capture = captureDisplay(screen);
    const { mean, deviation } = await readMiddleLuminance(snapshot);
    console.log(
      `${screen}: snapshot ${snapshot.width()}x${snapshot.height()} middle mean ${mean.toFixed(2)} deviation ${deviation.toFixed(2)}; display captured to ${capture}`
    );
  });
});
