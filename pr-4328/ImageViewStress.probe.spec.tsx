import type { SkImage } from "../../../skia/types";
import {
  loseGpuDevice,
  readMiddleLuminance,
  readScreenHalves,
  surface,
} from "../setup";

// What a screen should show, or why it does not.
type Check = (image: SkImage) => Promise<string | null>;

const assessCyanAboveRed: Check = async (image) => {
  const halves = await readScreenHalves(image);
  return halves.top === "cyan" && halves.bottom === "red"
    ? null
    : JSON.stringify(halves);
};

const assessEvenGrey: Check = async (image) => {
  const { mean, deviation } = await readMiddleLuminance(image);
  return deviation < 30 && mean > 60 && mean < 200
    ? null
    : `mean ${mean.toFixed(1)}, deviation ${deviation.toFixed(1)}`;
};

// Each mounted after a loss draws its images anew: a GPU and a CPU image,
// stripes drawn smaller from a GPU and from a CPU image, and images past a
// bitmap's limit.
const screens: readonly (readonly [string, Check])[] = [
  ["ImageView", assessCyanAboveRed],
  ["ImageViewMinifiedGpu", assessEvenGrey],
  ["ImageViewOversized", assessCyanAboveRed],
  ["ImageViewMinified", assessEvenGrey],
];

const CYCLES = Number(process.env.STRESS_CYCLES ?? "12");
// A screen whose images or levels are still on their way is captured again.
const CAPTURES = 6;

describe("SkiaImageView under repeated GPU device losses", () => {
  it(`draws every image after each of ${CYCLES} losses`, async () => {
    const failures: string[] = [];
    for (let cycle = 0; cycle < CYCLES; cycle++) {
      const further = await loseGpuDevice();
      if (further.length > 0) {
        failures.push(`cycle ${cycle}: further losses: ${further.join("; ")}`);
      }
      const [screen, assess] = screens[cycle % screens.length];
      let wrong: string | null = "not captured";
      for (let taken = 0; taken < CAPTURES && wrong !== null; taken++) {
        wrong = await assess(await surface.screen(screen));
      }
      console.log(`cycle ${cycle}, ${screen}: ${wrong ?? "drawn"}`);
      if (wrong !== null) {
        failures.push(`cycle ${cycle}, ${screen}: ${wrong}`);
      }
    }
    expect(failures).toEqual([]);
  }, CYCLES * 60_000);
});
